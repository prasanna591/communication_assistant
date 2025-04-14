from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import mediapipe as mp
from deepface import DeepFace
import whisper
import subprocess
import json
from moviepy.editor import VideoFileClip  # For audio extraction
import numpy as np
from pydub import AudioSegment  # For audio processing (optional but helpful for format conversion)
import io  # For handling audio in memory (optional)

app = Flask(__name__)
CORS(app)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Initialize Models ---
# MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, enable_segmentation=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

# DeepFace (will load model on first use)

# Whisper
try:
    whisper_model = whisper.load_model("base") # You can choose different models (tiny, base, small, medium, large)
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    whisper_model = None

# OpenPose (assuming it's installed and the bin directory is in your PATH or you know the path)
OPENPOSE_BIN_PATH = "path/to/OpenPose/bin/OpenPoseDemo.exe" # Replace with your actual path if needed

# --- Helper Functions ---

def extract_frames(video_path, output_folder="frames"):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    cap = cv2.VideoCapture(video_path)
    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if count % int(frame_rate) == 0:  # Save one frame per second
            frame_path = os.path.join(output_folder, f"frame_{int(count // frame_rate)}.jpg")
            cv2.imwrite(frame_path, frame)
        count += 1
    cap.release()
    return output_folder

def analyze_facial_emotions(frame_folder):
    all_emotion_scores = []
    dominant_emotions = []
    for filename in os.listdir(frame_folder):
        if filename.endswith((".jpg", ".jpeg", ".png")):
            try:
                analysis = DeepFace.analyze(img_path=os.path.join(frame_folder, filename), actions=['emotion'], silent=True, detector_backend='mtcnn') # Using MTCNN for potentially better detection
                if analysis and len(analysis) > 0: # Handle cases with no faces detected
                    dominant_emotion = analysis[0]['dominant_emotion']
                    emotion_scores = analysis[0]['emotion']
                    all_emotion_scores.append(emotion_scores)
                    dominant_emotions.append(dominant_emotion)
            except Exception as e:
                print(f"Error analyzing emotion in {filename}: {e}")

    if all_emotion_scores:
        avg_emotion_scores = {emotion: np.mean([scores.get(emotion, 0) for scores in all_emotion_scores]) for emotion in all_emotion_scores[0].keys()}
        dominant_emotion = max(set(dominant_emotions), key=dominant_emotions.count) if dominant_emotions else "Neutral"
        facial_emotion_score = avg_emotion_scores.get(dominant_emotion, 50) * 20 # Scale to 0-100
        return {"dominant_emotion": dominant_emotion, "scores": avg_emotion_scores, "overall_score": int(facial_emotion_score)}
    return None

def analyze_body_posture(video_path):
    all_visibility = []
    cap = cv2.VideoCapture(video_path)
    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if count % int(frame_rate) == 0:  # Analyze one frame per second
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb_frame)
                if results.pose_landmarks:
                    visibility_sum = 0
                    for landmark in results.pose_landmarks.landmark:
                        visibility_sum += landmark.visibility
                    all_visibility.append(visibility_sum / len(results.pose_landmarks.landmark))
            except Exception as e:
                print(f"Error analyzing body posture in frame {count}: {e}")
        count += 1

    if all_visibility:
        avg_visibility = np.mean(all_visibility)
        # Simple heuristic: Higher average visibility means better detected posture
        body_posture_score = int(avg_visibility * 100)
        return {"overall_score": body_posture_score}
    return None

def transcribe_speech(video_path):
    if whisper_model is None:
        return {"error": "Whisper model not loaded."}
    try:
        print("Starting speech transcription...")
        video_clip = VideoFileClip(video_path)
        print("VideoClip loaded.")

        # Convert to MP4 (H.264 video, AAC audio - common and compatible)
        converted_video_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_video.mp4")
        print(f"Converting video to MP4: {converted_video_path}")
        try:
            video_clip.write_videofile(converted_video_path, codec="libx264", audio_codec="aac", fps=24) # Added fps for more consistent conversion
            print("Video conversion complete.")
        except Exception as convert_error:
            video_clip.close()
            os.remove(video_path) # Clean up original if conversion fails early
            print(f"Error during video conversion: {convert_error}")
            return {"error": f"Error during video conversion: {convert_error}"}
        finally:
            video_clip.close() # Ensure original clip is closed

        video = VideoFileClip(converted_video_path) # Load the converted video
        audio = video.audio
        print("Audio track extracted from converted video.")
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_audio.mp3")
        print(f"Saving audio to: {audio_path}")
        audio.write_audiofile(audio_path)
        print("Audio file saved.")
        result = whisper_model.transcribe(audio_path)
        print("Transcription complete.")
        os.remove(audio_path)
        print(f"Removed temporary audio file: {audio_path}")
        os.remove(converted_video_path) # Remove the temporary converted video
        print(f"Removed temporary converted video file: {converted_video_path}")
        transcript = result["text"]
        words = transcript.split()
        duration = video.duration
        speech_pace = int(len(words) / (duration / 60)) if duration > 0 else 0
        filler_words = ["um", "uh", "like", "you know", "so", "well", "actually"]
        filler_count = sum(1 for word in words if word.lower() in filler_words)
        speech_clarity_score = int(max(0, 100 - (filler_count / len(words) if words else 0) * 100))
        return {"transcript": transcript, "speech_pace": speech_pace, "speech_clarity_fillers": speech_clarity_score}
    except Exception as e:
        print(f"Error transcribing speech: {e}")
        return {"error": f"Error transcribing speech: {e}"}
    finally:
        if 'audio' in locals() and audio is not None:
            audio.close()
            print("Audio clip closed.")
        if 'video' in locals() and video is not None:
            video.close()
            print("Video clip closed.")

def analyze_openpose(video_path):
    if not os.path.exists(OPENPOSE_BIN_PATH):
        return {"error": f"OpenPose executable not found at: {OPENPOSE_BIN_PATH}. Please configure the path."}

    output_json_dir = os.path.join(app.config['UPLOAD_FOLDER'], "openpose_output")
    if not os.path.exists(output_json_dir):
        os.makedirs(output_json_dir)

    command = [
        OPENPOSE_BIN_PATH,
        "--video", video_path,
        "--write_json", output_json_dir,
        "--display", "0" # Don't display the output
    ]

    try:
        subprocess.run(command, check=True, capture_output=True)
        pose_data = []
        for filename in os.listdir(output_json_dir):
            if filename.endswith(".json"):
                with open(os.path.join(output_json_dir, filename), 'r') as f:
                    try:
                        data = json.load(f)
                        pose_data.extend(data['people'])
                    except json.JSONDecodeError as e:
                        print(f"Error decoding JSON in {filename}: {e}")
        # Basic score based on whether any person is detected
        openpose_score = 70 if pose_data else 30
        return {"openpose_data": pose_data, "overall_score": openpose_score}
    except subprocess.CalledProcessError as e:
        return {"error": f"Error running OpenPose: {e.stderr.decode('utf-8')}"}
    except FileNotFoundError:
        return {"error": f"OpenPose executable not found at: {OPENPOSE_BIN_PATH}"}
    finally:
        # Clean up OpenPose output directory
        for filename in os.listdir(output_json_dir):
            file_path = os.path.join(output_json_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")
        if os.path.exists(output_json_dir):
            os.rmdir(output_json_dir)

# --- Flask Endpoint ---

@app.route('/api/analyze', methods=['POST'])
def analyze_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video_file = request.files['video']

    if video_file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400

    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
    try:
        video_file.save(video_path)
        print(f"Video saved to: {video_path}")

        analysis_results = {
            "overall_score": 0,
            "scores": {},
            "details": {}
        }
        individual_scores = {}

        # --- Facial Emotion Analysis ---
        print("Starting Facial Emotion Analysis...")
        frame_folder = os.path.join(app.config['UPLOAD_FOLDER'], "frames")
        if os.path.exists(frame_folder):
            for filename in os.listdir(frame_folder):
                os.remove(os.path.join(frame_folder, filename))
            os.rmdir(frame_folder)
        frame_folder = extract_frames(video_path, frame_folder)
        emotion_analysis = analyze_facial_emotions(frame_folder)
        if emotion_analysis:
            analysis_results['details']['dominant_emotion'] = emotion_analysis['dominant_emotion']
            analysis_results['scores']['facial_emotion'] = emotion_analysis['overall_score']
            analysis_results['details']['emotion_counts'] = emotion_analysis['scores']
            individual_scores['facial_emotion'] = emotion_analysis['overall_score']
        else:
            analysis_results['details']['dominant_emotion'] = "N/A"
            analysis_results['scores']['facial_emotion'] = "N/A"
            analysis_results['details']['emotion_counts'] = {}
            individual_scores['facial_emotion'] = 0
        # Clean up frames
        if os.path.exists(frame_folder):
            for filename in os.listdir(frame_folder):
                os.remove(os.path.join(frame_folder, filename))
            os.rmdir(frame_folder)
        print("Facial Emotion Analysis Done.")

        # --- Body Posture Analysis (MediaPipe) ---
        print("Starting Body Posture Analysis (MediaPipe)...")
        body_posture_result = analyze_body_posture(video_path)
        if body_posture_result:
            analysis_results['scores']['body_posture'] = body_posture_result['overall_score']
            individual_scores['body_posture'] = body_posture_result['overall_score']
        else:
            analysis_results['scores']['body_posture'] = "N/A"
            individual_scores['body_posture'] = 0
        analysis_results['details']['body_posture_landmarks'] = analyze_body_posture(video_path) # Keep raw landmarks for potential detailed view
        print("Body Posture Analysis (MediaPipe) Done.")

        # --- Speech Transcription (Whisper) ---
        print("Starting Speech Transcription (Whisper)...")
        speech_result = transcribe_speech(video_path)
        print("Speech Transcription Result:", speech_result)
        if "transcript" in speech_result:
            analysis_results['details']['transcript_preview'] = speech_result['transcript'][:500] + "..."
            analysis_results['scores']['speech_pace'] = speech_result['speech_pace']
            analysis_results['scores']['speech_clarity_fillers'] = speech_result['speech_clarity_fillers']
            individual_scores['speech_pace'] = speech_result['speech_pace']
            individual_scores['speech_clarity_fillers'] = speech_result['speech_clarity_fillers']
            analysis_results['details']['full_transcript'] = speech_result['transcript'] # Optionally include full transcript
        elif "error" in speech_result:
            analysis_results['details']['transcript_error'] = speech_result['error']
            analysis_results['scores']['speech_pace'] = "N/A"
            analysis_results['scores']['speech_clarity_fillers'] = "N/A"
            individual_scores['speech_pace'] = 0
            individual_scores['speech_clarity_fillers'] = 0
        print("Speech Transcription (Whisper) Done.")

        # --- Body Pose Analysis (OpenPose) ---
        print("Starting Body Pose Analysis (OpenPose)...")
        openpose_result = analyze_openpose(video_path)
        if "overall_score" in openpose_result:
            analysis_results['scores']['openpose'] = openpose_result['overall_score']
            individual_scores['openpose'] = openpose_result['overall_score']
            analysis_results['details']['openpose_data'] = openpose_result.get('openpose_data', [])
        else:
            analysis_results['scores']['openpose'] = "N/A"
            individual_scores['openpose'] = 0
            analysis_results['details']['openpose_error'] = openpose_result.get('error')
        print("Body Pose Analysis (OpenPose) Done.")

        # --- Calculate Overall Score (Simple Averaging) ---
        valid_scores = [score for score in individual_scores.values() if isinstance(score, (int, float))]
        analysis_results['overall_score'] = int(np.mean(valid_scores)) if valid_scores else "N/A"

        # --- Generate Feedback Summary (Basic) ---
        feedback_summary = f"Overall Score: {analysis_results['overall_score']}. "
        if analysis_results['scores'].get('facial_emotion', 'N/A') != 'N/A':
            feedback_summary += f"Dominant Emotion: {analysis_results['details'].get('dominant_emotion', 'N/A')}. "
        if analysis_results['scores'].get('speech_pace', 'N/A') != 'N/A':
            feedback_summary += f"Speech Pace: {analysis_results['scores']['speech_pace']} WPM. "
        if analysis_results['scores'].get('speech_clarity_fillers', 'N/A') != 'N/A':
            feedback_summary += f"Speech Clarity Score: {analysis_results['scores']['speech_clarity_fillers']}. "
        analysis_results['feedback_summary'] = feedback_summary

        return jsonify(analysis_results), 200

    except Exception as e:
        print(f"Error processing video: {e}")
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500
    finally:
        # Clean up the uploaded video
        if os.path.exists(video_path):
            os.remove(video_path)

if __name__ == '__main__':
    app.run(debug=True)