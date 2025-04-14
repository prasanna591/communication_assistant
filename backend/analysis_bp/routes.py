import os
import cv2
import mediapipe as mp
from deepface import DeepFace
import whisper
import subprocess
import json
from moviepy.editor import VideoFileClip
import numpy as np
import shutil

from flask import Blueprint, request, jsonify
from flask_cors import CORS # You might not need this here anymore as it's in app.py

# Create a Blueprint instance
analysis_bp = Blueprint('analysis', __name__, url_prefix='/api') # You can adjust the url_prefix as needed

# --- Configuration (Adjust paths to be relative if needed) ---
UPLOAD_FOLDER = 'uploads'
FRAMES_FOLDER = os.path.join(UPLOAD_FOLDER, 'frames')
OPENPOSE_OUTPUT_FOLDER = os.path.join(UPLOAD_FOLDER, 'openpose_output')

# Ensure upload directory exists (You can keep this here or in app.py)
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Initialize Models ---
# MediaPipe Pose
mp_pose = None
pose = None
mp_drawing = None
try:
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, enable_segmentation=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    print("MediaPipe Pose model loaded in blueprint.")
except Exception as e:
    print(f"Error loading MediaPipe Pose model in blueprint: {e}")

# DeepFace
print("DeepFace initialized (model will load on first use) in blueprint.")

# Whisper
whisper_model = None
try:
    whisper_model = whisper.load_model("base")
    print(f"Whisper model 'base' loaded successfully in blueprint.")
except Exception as e:
    print(f"Error loading Whisper model in blueprint: {e}. Speech transcription will be unavailable.")

# OpenPose Configuration
OPENPOSE_BIN_PATH = "C:/path/to/openpose/bin/OpenPoseDemo.exe" # <<<--- CHANGE THIS TO YOUR ACTUAL PATH
if not os.path.exists(OPENPOSE_BIN_PATH):
    print(f"WARNING: OpenPose executable not found at specified path in blueprint: {OPENPOSE_BIN_PATH}")
    print("Please update OPENPOSE_BIN_PATH in the blueprint.")

# --- Helper Functions ---
def cleanup_directory(dir_path):
    # ... (No changes needed) ...
    if os.path.exists(dir_path):
        try:
            shutil.rmtree(dir_path)
            print(f"Cleaned up directory: {dir_path}")
        except OSError as e:
            print(f"Error cleaning up directory {dir_path}: {e}")

def extract_frames(video_path, output_folder):
    # ... (No changes needed) ...
    cleanup_directory(output_folder)
    os.makedirs(output_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file: {video_path}")
        return None, 0

    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    if frame_rate is None or frame_rate == 0:
        print("Warning: Could not determine video frame rate. Defaulting analysis interval.")
        frame_interval = 30
    else:
        frame_interval = int(frame_rate)

    count = 0
    saved_frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if count % frame_interval == 0:
            frame_path = os.path.join(output_folder, f"frame_{saved_frame_count}.jpg")
            cv2.imwrite(frame_path, frame)
            saved_frame_count += 1
        count += 1

    cap.release()
    print(f"Extracted {saved_frame_count} frames to {output_folder}")
    return output_folder, frame_rate

def analyze_facial_emotions(frame_folder):
    # ... (No changes needed) ...
    if not os.path.exists(frame_folder):
        print(f"Frame folder not found: {frame_folder}")
        return None

    all_emotion_scores = []
    dominant_emotions_list = []
    frame_files = [f for f in os.listdir(frame_folder) if f.lower().endswith((".jpg", ".jpeg", ".png"))]

    if not frame_files:
        print("No frames found to analyze for emotions.")
        return None

    print(f"Analyzing emotions for {len(frame_files)} frames...")
    processed_count = 0
    for filename in frame_files:
        frame_path = os.path.join(frame_folder, filename)
        try:
            analysis = DeepFace.analyze(
                img_path=frame_path,
                actions=['emotion'],
                silent=True,
                detector_backend='mtcnn'
            )
            if analysis and isinstance(analysis, list) and len(analysis) > 0:
                first_face = analysis[0]
                dominant_emotion = first_face['dominant_emotion']
                emotion_scores = first_face['emotion']
                all_emotion_scores.append(emotion_scores)
                dominant_emotions_list.append(dominant_emotion)
                processed_count += 1
        except ValueError as ve:
            print(f"No face detected by DeepFace in {filename}: {ve}")
        except Exception as e:
            print(f"Error analyzing emotion in {filename}: {e}")

    if not all_emotion_scores:
        print("No faces detected or analyzed across all frames.")
        return {"dominant_emotion": "N/A", "scores": {}, "overall_score": 0}

    avg_emotion_scores = {
        emotion: np.mean([scores.get(emotion, 0) for scores in all_emotion_scores])
        for emotion in all_emotion_scores[0].keys()
    }

    dominant_emotion = max(set(dominant_emotions_list), key=dominant_emotions_list.count) if dominant_emotions_list else "Neutral"

    positive_score = avg_emotion_scores.get('happy', 0) + avg_emotion_scores.get('neutral', 0) * 0.7
    negative_score = avg_emotion_scores.get('sad', 0) + avg_emotion_scores.get('angry', 0) + avg_emotion_scores.get('fear', 0)

    facial_emotion_score = (positive_score * 0.6) - (negative_score * 0.4)
    facial_emotion_score = max(0, min(100, int(facial_emotion_score)))

    print(f"Emotion Analysis Complete: Dominant={dominant_emotion}, Calculated Score={facial_emotion_score}")
    return {
        "dominant_emotion": dominant_emotion,
        "scores": avg_emotion_scores,
        "overall_score": facial_emotion_score
    }

def analyze_body_posture(video_path):
    # ... (No changes needed) ...
    if pose is None:
        print("MediaPipe Pose model not loaded. Skipping posture analysis.")
        return None

    all_visibility = []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file for posture analysis: {video_path}")
        return None

    frame_rate = cap.get(cv2.CAP_PROP_FPS)
    if frame_rate is None or frame_rate == 0:
        print("Warning: Could not determine video frame rate. Defaulting analysis interval.")
        frame_interval = 30
    else:
        frame_interval = int(frame_rate)

    count = 0
    processed_frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if count % frame_interval == 0:
            processed_frame_count += 1
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb_frame)

                if results.pose_landmarks:
                    visibility_sum = sum(landmark.visibility for landmark in results.pose_landmarks.landmark)
                    num_landmarks = len(results.pose_landmarks.landmark)
                    avg_frame_visibility = visibility_sum / num_landmarks if num_landmarks > 0 else 0
                    all_visibility.append(avg_frame_visibility)

            except Exception as e:
                print(f"Error analyzing body posture in frame {count}: {e}")
        count += 1

    cap.release()

    if not all_visibility:
        print("No pose landmarks detected in any analyzed frames.")
        return {"overall_score": 0, "average_visibility": 0}

    avg_visibility = np.mean(all_visibility)
    body_posture_score = int(avg_visibility * 100)
    body_posture_score = max(0, min(100, body_posture_score))

    print(f"Posture Analysis Complete: Avg Visibility={avg_visibility:.2f}, Score={body_posture_score}")
    return {"overall_score": body_posture_score, "average_visibility": avg_visibility}

def transcribe_speech(video_path):
    # ... (No changes needed) ...
    if whisper_model is None:
        print("Whisper model not loaded. Skipping speech transcription.")
        return {"error": "Whisper model not loaded."}

    audio_path = None
    video_clip = None
    audio_clip = None
    temp_audio_filename = "temp_audio_for_whisper.mp3"

    try:
        print("Starting speech transcription...")
        print(f"Loading video file: {video_path}")
        video_clip = VideoFileClip(video_path)
        audio_clip = video_clip.audio

        if audio_clip is None:
            print("Video file does not contain an audio track.")
            return {"error": "No audio track found in video."}

        print("Audio track found. Extracting to temporary file...")
        audio_path = os.path.join(UPLOAD_FOLDER, temp_audio_filename)
        audio_clip.write_audiofile(audio_path, codec='mp3')
        print(f"Temporary audio file saved: {audio_path}")

        print("Transcribing audio with Whisper...")
        result = whisper_model.transcribe(audio_path, fp16=False)
        print("Transcription complete.")

        transcript = result["text"]
        words = transcript.split()
        num_words = len(words)
        duration_seconds = video_clip.duration

        speech_pace_wpm = 0
        if duration_seconds > 0:
            speech_pace_wpm = int(num_words / (duration_seconds / 60.0))
        else:
            print("Warning: Video duration is zero, cannot calculate speech pace.")

        filler_words = ["um", "uh", "like", "you know", "so", "well", "actually", "basically", "literally"]
        filler_count = sum(1 for word in words if word.lower().strip('.,?!') in filler_words)

        speech_clarity_score = 100
        if num_words > 0:
            filler_ratio = filler_count / num_words
            clarity_penalty = filler_ratio * 200
            speech_clarity_score = int(max(0, 100 - clarity_penalty))
        else:
            speech_clarity_score = 100

        print(f"Speech Analysis: Pace={speech_pace_wpm} WPM, Clarity Score={speech_clarity_score} (Fillers={filler_count}/{num_words})")
        return {
            "transcript": transcript,
            "speech_pace_wpm": speech_pace_wpm,
            "speech_clarity_score": speech_clarity_score,
            "word_count": num_words,
            "filler_count": filler_count
        }

    except Exception as e:
        print(f"Error during speech transcription: {e}")
        return {"error": f"Error transcribing speech: {str(e)}"}

    finally:
        if audio_clip:
            try:
                audio_clip.close()
            except Exception as e_close:
                print(f"Error closing audio clip: {e_close}")
        if video_clip:
            try:
                video_clip.close()
            except Exception as e_close:
                print(f"Error closing video clip: {e_close}")
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"Removed temporary audio file: {audio_path}")
            except OSError as e_remove:
                print(f"Error removing temporary audio file {audio_path}: {e_remove}")

def analyze_openpose(video_path, output_json_dir):
    # ... (No changes needed) ...
    if not OPENPOSE_BIN_PATH or not os.path.exists(OPENPOSE_BIN_PATH):
        msg = f"OpenPose executable not found or path not configured correctly ({OPENPOSE_BIN_PATH}). Skipping OpenPose analysis."
        print(msg)
        return {"error": msg}

    cleanup_directory(output_json_dir)
    os.makedirs(output_json_dir, exist_ok=True)

    command = [
        OPENPOSE_BIN_PATH,
        "--video", video_path,
        "--write_json", output_json_dir,
        "--display", "0",
        "--render_pose", "0"
    ]
    print(f"Running OpenPose command: {' '.join(command)}")

    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8')
        print("OpenPose ran successfully.")

        pose_data_frames = []
        json_files = sorted([f for f in os.listdir(output_json_dir) if f.endswith(".json")])

        if not json_files:
            print("OpenPose ran but produced no JSON output files.")
            return {"error": "OpenPose produced no output.", "overall_score": 0, "openpose_people_detected": 0}

        print(f"Processing {len(json_files)} OpenPose JSON files...")
        people_detected_count = 0
        for filename in json_files:
            filepath = os.path.join(output_json_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    pose_data_frames.append(data['people'])
                    if data.get('people'):
                        people_detected_count += len(data['people'])
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON in {filename}: {e}")
            except Exception as e:
                print(f"Error reading or processing {filename}: {e}")

        frames_with_people = sum(1 for frame_people in pose_data_frames if frame_people)
        total_frames_analyzed = len(json_files)
        detection_consistency = (frames_with_people / total_frames_analyzed) if total_frames_analyzed > 0 else 0
        openpose_score = int(detection_consistency * 100)

        print(f"OpenPose Analysis Complete: Detected people in {frames_with_people}/{total_frames_analyzed} frames. Score={openpose_score}")
        return {
            "overall_score": openpose_score,
            "openpose_frames_analyzed": total_frames_analyzed,
            "openpose_frames_with_people": frames_with_people
        }

    except subprocess.CalledProcessError as e:
        error_msg = f"Error running OpenPose. Return code: {e.returncode}\nStderr: {e.stderr}\nStdout: {e.stdout}"
        print(error_msg)
        return {"error": error_msg, "overall_score": 0}
    except FileNotFoundError:
        error_msg = f"OpenPose executable not found at: {OPENPOSE_BIN_PATH}. Make sure it's installed and the path is correct."
        print(error_msg)
        return {"error": error_msg, "overall_score": 0}
    except Exception as e:
        error_msg = f"An unexpected error occurred during OpenPose analysis: {e}"
        print(error_msg)
        return {"error": error_msg, "overall_score": 0}
    finally:
        cleanup_directory(output_json_dir)

# --- Flask Endpoint (Modify the route decorator) ---
@analysis_bp.route('/analyze', methods=['POST'])
def analyze_video():
    # ... (Keep the rest of your analyze_video function as is) ...
    if 'video' not in request.files:
        return jsonify({'error': 'No video file part in the request'}), 400

    video_file = request.files['video']

    if video_file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400

    filename = video_file.filename
    video_path = os.path.join(UPLOAD_FOLDER, filename)

    request_frame_folder = os.path.join(UPLOAD_FOLDER, f"frames_{os.path.splitext(filename)[0]}")
    request_openpose_folder = os.path.join(UPLOAD_FOLDER, f"openpose_{os.path.splitext(filename)[0]}")

    try:
        video_file.save(video_path)
        print(f"Video saved to: {video_path}")

        analysis_results = {
            "overall_score": "N/A",
            "scores": {},
            "metrics": {},
            "details": {},
            "errors": []
        }
        scores_to_average = {}

        print("\n--- Starting Facial Emotion Analysis ---")
        extracted_frames_path, _ = extract_frames(video_path, request_frame_folder)
        if extracted_frames_path:
            emotion_result = analyze_facial_emotions(extracted_frames_path)
            if emotion_result:
                if 'error' in emotion_result:
                    analysis_results['errors'].append(f"Emotion Analysis Error: {emotion_result['error']}")
                    analysis_results['scores']['facial_emotion'] = "Error"
                else:
                    analysis_results['details']['dominant_emotion'] = emotion_result['dominant_emotion']
                    analysis_results['scores']['facial_emotion'] = emotion_result['overall_score']
                    analysis_results['details']['emotion_avg_scores'] = emotion_result['scores']
                    scores_to_average['facial_emotion'] = emotion_result['overall_score']
            else:
                analysis_results['scores']['facial_emotion'] = "N/A"
                analysis_results['errors'].append("Emotion analysis returned no result.")
            cleanup_directory(extracted_frames_path)
        else:
            analysis_results['scores']['facial_emotion'] = "N/A"
            analysis_results['errors'].append("Frame extraction failed.")
        print("--- Facial Emotion Analysis Done ---")

        print("\n--- Starting Body Posture Analysis (MediaPipe) ---")
        posture_result = analyze_body_posture(video_path)
        if posture_result:
            if 'error' in posture_result:
                analysis_results['errors'].append(f"Posture Analysis Error: {posture_result['error']}")
                analysis_results['scores']['body_posture_mediapipe'] = "Error"
            else:
                analysis_results['scores']['body_posture_mediapipe'] = posture_result['overall_score']
                analysis_results['metrics']['posture_avg_visibility'] = round(posture_result.get('average_visibility', 0), 2)
                scores_to_average['body_posture_mediapipe'] = posture_result['overall_score']
        else:
            analysis_results['scores']['body_posture_mediapipe'] = "N/A"
            analysis_results['errors'].append("Posture analysis (MediaPipe) returned no result.")
        print("--- Body Posture Analysis (MediaPipe) Done ---")

        print("\n--- Starting Speech Transcription & Analysis (Whisper) ---")
        speech_result = transcribe_speech(video_path)
        if speech_result:
            if "error" in speech_result:
                analysis_results['errors'].append(f"Speech Analysis Error: {speech_result['error']}")
                analysis_results['scores']['speech_clarity'] = "Error"
                analysis_results['metrics']['speech_pace_wpm'] = "Error"
                analysis_results['details']['transcript_preview'] = "Error"
            else:
                analysis_results['metrics']['speech_pace_wpm'] = speech_result['speech_pace_wpm']
                analysis_results['scores']['speech_clarity'] = speech_result['speech_clarity_score']
                analysis_results['metrics']['word_count'] = speech_result['word_count']
                analysis_results['metrics']['filler_count'] = speech_result['filler_count']
                transcript = speech_result['transcript']
                analysis_results['details']['transcript_preview'] = transcript[:300] + ("..." if len(transcript) > 300 else "")
                scores_to_average['speech_clarity'] = speech_result['speech_clarity_score']
        else:
            analysis_results['scores']['speech_clarity'] = "N/A"
            analysis_results['metrics']['speech_pace_wpm'] = "N/A"
            analysis_results['errors'].append("Speech analysis returned no result.")
        print("--- Speech Transcription & Analysis Done ---")

        print("\n--- Starting Body Pose Analysis (OpenPose) ---")
        openpose_result = analyze_openpose(video_path, request_openpose_folder)
        if openpose_result:
            if "error" in openpose_result:
                analysis_results['errors'].append(f"OpenPose Analysis Error: {openpose_result['error']}")
                analysis_results['scores']['body_pose_openpose'] = "Error"
            else:
                analysis_results['scores']['body_pose_openpose'] = openpose_result['overall_score']
                analysis_results['metrics']['openpose_frames_analyzed'] = openpose_result.get('openpose_frames_analyzed')
                analysis_results['metrics']['openpose_frames_with_people'] = openpose_result.get('openpose_frames_with_people')
                scores_to_average['body_pose_openpose'] = openpose_result['overall_score']
        else:
            analysis_results['scores']['body_pose_openpose'] = "N/A"
            analysis_results['errors'].append("OpenPose analysis returned no result.")
        print("--- Body Pose Analysis (OpenPose) Done ---")

        print("\n--- Calculating Overall Score ---")
        valid_scores = [s for s in scores_to_average.values() if isinstance(s, (int, float))]
        if valid_scores:
            overall_score = int(np.mean(valid_scores))
            analysis_results['overall_score'] = max(0, min(100, overall_score))
            print(f"Scores averaged: {scores_to_average}")
            print(f"Calculated Overall Score: {analysis_results['overall_score']}")
        else:
            analysis_results['overall_score'] = 0
            print("No valid scores available to calculate an overall score.")

        summary_parts = [f"Overall Score: {analysis_results['overall_score']}/100."]
        if analysis_results['scores'].get('facial_emotion') not in ["N/A", "Error"]:
            summary_parts.append(f"Appeared predominantly {analysis_results['details'].get('dominant_emotion', 'neutral')}.")
        if analysis_results['metrics'].get('speech_pace_wpm') not in ["N/A", "Error"]:
            wpm = analysis_results['metrics']['speech_pace_wpm']
            pace_desc = "very fast" if wpm > 170 else "fast" if wpm > 140 else "moderate" if wpm > 110 else "slow"
            summary_parts.append(f"Speech pace was {pace_desc} ({wpm} WPM).")
        if analysis_results['scores'].get('speech_clarity') not in ["N/A", "Error"]:
            clarity = analysis_results['scores']['speech_clarity']
            clarity_desc = "very clear" if clarity > 90 else "clear" if clarity > 75 else "moderately clear" if clarity > 50 else "less clear"
            filler_count = analysis_results['metrics'].get('filler_count', 0)
            summary_parts.append(f"Speech was {clarity_desc} (Clarity Score: {clarity}/100, Fillers: {filler_count}).")
        if analysis_results['scores'].get('body_posture_mediapipe') not in ["N/A", "Error"]:
            vis = analysis_results['metrics'].get('posture_avg_visibility', 0)
            posture_desc = "clearly visible" if vis > 0.7 else "moderately visible" if vis > 0.4 else "partially obscured"
            summary_parts.append(f"Posture was generally {posture_desc}.")

        analysis_results['feedback_summary'] = " ".join(summary_parts)

        print("\n--- Analysis Complete ---")
        return jsonify(analysis_results), 200

    except FileNotFoundError as e:
        print(f"Error: Input video file not found after saving? {e}")
        return jsonify({'error': f'File processing error: {str(e)}'}), 500
    except Exception as e:
        import traceback
        print(f"FATAL: Unexpected error processing video: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500
    finally:
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                print(f"Cleaned up uploaded video: {video_path}")
            except OSError as e:
                print(f"Error deleting uploaded video {video_path}: {e}")
        cleanup_directory(request_frame_folder)
        cleanup_directory(request_openpose_folder)

# No need for the if __name__ == '__main__': block here as it will be in app.py