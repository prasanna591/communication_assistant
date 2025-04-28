import React, { useState, useRef, useEffect, useCallback } from "react";
import "./AnalysisUploader.css"; // Assuming you might add some CSS later

// Define the base URL for your Flask backend
// Make sure this matches where your Flask app is running (e.g., http://localhost:5000)
const API_BASE_URL = "http://localhost:5000/api";
const ANALYZE_ENDPOINT = "/analyze"; // The endpoint that performs all analysis

function AnalysisUploader() {
  // --- State Management ---
  // Component status: 'idle', 'recording', 'processing', 'success', 'error'
  const [status, setStatus] = useState("idle");
  // Stores the analysis result received from the backend
  const [analysisResult, setAnalysisResult] = useState(null);
  // Stores any error messages
  const [error, setError] = useState(null);
  // Stores the file selected via upload (null if recording)
  const [selectedFile, setSelectedFile] = useState(null);
  // Stores the selected analysis type (e.g., 'interview', 'presentation')
  const [analysisType, setAnalysisType] = useState("interview"); // Default type

  // --- Refs for Media Recording and Video Playback ---
  const mediaRecorder = useRef(null); // Reference to the MediaRecorder instance
  const recordedChunks = useRef([]); // Array to store video data chunks
  const videoRef = useRef(null); // Reference to the video element for webcam preview
  const streamRef = useRef(null); // Reference to the media stream from webcam
  const fileInputRef = useRef(null); // Reference to the hidden file input element

  // --- Recording Logic ---

  // Starts recording from the webcam
  const startRecording = async () => {
    if (status === "recording") return; // Prevent starting if already recording

    setStatus("recording");
    setError(null); // Clear previous errors
    setAnalysisResult(null); // Clear previous results
    setSelectedFile(null); // Clear selected file state if switching from upload
    recordedChunks.current = []; // Clear previous recorded data

    try {
      // Request access to video and audio devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream; // Store the stream reference

      // Display the webcam stream in the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute local playback
        videoRef.current.play().catch(console.error); // Start playback, catch potential errors
      }

      // Create a new MediaRecorder instance
      let recorder;
      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
      } else {
        console.warn("WebM with VP8/Opus not supported, trying default.");
        recorder = new MediaRecorder(stream);
      }
      mediaRecorder.current = recorder;
      console.log("Using MIME type:", mediaRecorder.current.mimeType);

      // Event handler for available data chunks
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data); // Add data chunk to the array
        }
      };

      // Event handler for when recording stops
      mediaRecorder.current.onstop = () => {
        console.log("Recording stopped, processing data...");
        // Combine recorded chunks into a single Blob
        const blob = new Blob(recordedChunks.current, {
          type: mediaRecorder.current.mimeType || "video/webm", // Use recorded MIME type or default
        });
        recordedChunks.current = []; // Clear chunks after creating Blob
        // Trigger analysis with the recorded video Blob
        analyzeVideo(
          blob,
          `recorded_video.${blob.type.split("/")[1] || "webm"}`
        ); // Provide a filename
      };

      // Event handler for MediaRecorder errors
      mediaRecorder.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError(
          `Recording error: ${event.error.name} - ${event.error.message}`
        );
        setStatus("error");
        stopRecording(); // Attempt to stop recording and stream cleanly
      };

      // Start recording, collecting data in 1-second chunks (optional, can be removed)
      mediaRecorder.current.start(1000);
      console.log("Recording started");
    } catch (err) {
      // Handle errors when accessing media devices (camera/mic)
      console.error("Error accessing media devices:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Camera/Microphone Permissions Denied. Please allow access in browser settings."
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        setError(
          "No Camera/Microphone found. Please ensure they are connected and enabled."
        );
      } else {
        setError(`Error accessing media devices: ${err.name}`);
      }
      setStatus("error");
    }
  };

  // Stops the camera/audio stream tracks
  const stopStreamTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop()); // Stop each track in the stream
      streamRef.current = null; // Clear the stream reference
      console.log("Camera/Audio stream stopped.");
    }
    // Stop displaying the stream in the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []); // useCallback memoizes this function

  // Stops the MediaRecorder and the stream
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && status === "recording") {
      try {
        mediaRecorder.current.stop(); // Stop the MediaRecorder
        console.log("Attempting to stop MediaRecorder...");
      } catch (error) {
        console.error("Error stopping recorder:", error);
        setError("Failed to stop recording cleanly.");
        setStatus("error");
      }
    }
    stopStreamTracks(); // Stop the underlying stream
    setStatus("idle"); // Set status back to idle after stopping
  }, [status, stopStreamTracks]); // Dependencies for useCallback

  // --- File Upload Logic ---

  // Handler for when a file is selected via the hidden input
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic validation for file type
      if (!file.type.startsWith("video/")) {
        setError("Invalid file type. Please select a video file.");
        setSelectedFile(null); // Clear selected file
        event.target.value = null; // Reset the input value
        return;
      }
      setSelectedFile(file); // Store the selected file
      setError(null); // Clear previous errors
      setAnalysisResult(null); // Clear previous results
      setStatus("idle"); // Set status to idle (ready to analyze file)
      console.log("File selected:", file.name);
    }
  };

  // Triggers the click event on the hidden file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handler to analyze the currently selected uploaded file
  const handleAnalyzeUploadedFile = () => {
    if (selectedFile) {
      // Trigger analysis with the selected file Blob and its name
      analyzeVideo(selectedFile, selectedFile.name);
    } else {
      setError("No file selected to analyze.");
    }
  };

  // --- Analysis Type Selection ---

  // Handler for changes in the analysis type dropdown
  const handleAnalysisTypeChange = (event) => {
    setAnalysisType(event.target.value); // Update the selected analysis type state
    console.log("Analysis type selected:", event.target.value);
  };

  // --- Core Analysis Function ---

  // Sends video data (Blob or File) to the backend for analysis
  const analyzeVideo = async (videoData, filename) => {
    if (!videoData) {
      setError("No video data to analyze.");
      return;
    }

    // Create FormData to send the video file and analysis type
    const formData = new FormData();
    // Append the video data with a specified filename
    formData.append("video", videoData, filename);
    // Append the selected analysis type
    formData.append("analysis_type", analysisType); // This matches the key expected by the backend /analyze route

    setStatus("processing"); // Set status to processing (uploading/analyzing)
    setError(null); // Clear previous errors
    setAnalysisResult(null); // Clear previous results
    console.log(
      `Sending ${filename} to backend endpoint ${ANALYZE_ENDPOINT}...`
    );

    try {
      // Send the POST request to the backend analysis endpoint
      const response = await fetch(`${API_BASE_URL}${ANALYZE_ENDPOINT}`, {
        method: "POST",
        body: formData, // FormData handles the Content-Type header
      });

      // Parse the JSON response
      const data = await response.json();

      // Check if the HTTP response status indicates an error
      if (!response.ok) {
        // Extract error message from backend response if available, otherwise use status
        const errorMsg =
          data?.error ||
          data?.message ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg); // Throw an error to be caught by the catch block
      }

      console.log("Analysis successful:", data);
      setAnalysisResult(data); // Store the successful analysis result
      setStatus("success"); // Update status to success
    } catch (err) {
      // Handle errors during the fetch or backend processing
      console.error("Error sending data to backend:", err);

      // Provide more specific error messages for common issues
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Network Error: Could not connect to the analysis server. Please ensure the backend is running and accessible."
        );
      } else {
        setError(`Analysis Failed: ${err.message}`); // Display the error message from the backend or fetch
      }
      setStatus("error"); // Update status to error
      setAnalysisResult(null); // Clear results on error
    } finally {
      // Reset the file input value after processing (optional, prevents re-uploading same file if selected again)
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // --- Effect for Cleanup ---

  // useEffect hook to clean up the camera stream when the component unmounts
  useEffect(() => {
    // The cleanup function
    return () => {
      console.log("Component unmounting - cleaning up stream...");
      stopStreamTracks(); // Ensure camera is turned off
      // Also ensure MediaRecorder is stopped if it was active
      if (
        mediaRecorder.current &&
        mediaRecorder.current.state === "recording"
      ) {
        try {
          mediaRecorder.current.stop();
          console.log("MediaRecorder stopped during unmount.");
        } catch (error) {
          console.error("Error stopping recorder on unmount:", error);
        }
      }
    };
  }, [stopStreamTracks]); // Dependency array: re-run effect if stopStreamTracks changes (it won't due to useCallback)

  // --- Rendering Logic ---

  // Helper function to render feedback based on the current status and results
  const renderFeedback = () => {
    if (status === "processing") {
      return <p>Analyzing video, please wait...</p>;
    }
    if (status === "error") {
      return (
        <div className="error-message">
          <p>Error:</p>
          <pre>{error || "An unknown error occurred."}</pre>
        </div>
      );
    }
    // Display formatted results if analysis was successful and results are available
    if (status === "success" && analysisResult) {
      return (
        <div className="feedback-results">
          <h3>Analysis Results:</h3>
          <p>
            <strong>
              {analysisResult.feedback_summary ||
                "Analysis Complete. No summary provided."}
            </strong>
          </p>
          <ul>
            <li>
              Overall Score: {analysisResult.overall_score ?? "N/A"} / 100
            </li>
            <li>
              Facial Emotion Score:{" "}
              {analysisResult.scores?.facial_emotion ?? "N/A"} (Dominant:{" "}
              {analysisResult.details?.dominant_emotion ?? "N/A"})
            </li>
            <li>
              Body Posture (MediaPipe) Score:{" "}
              {analysisResult.scores?.body_posture_mediapipe ?? "N/A"}
            </li>
            <li>
              Body Pose (OpenPose) Score:{" "}
              {analysisResult.scores?.body_pose_openpose ?? "N/A"}
            </li>
            <li>
              Speech Pace (WPM):{" "}
              {analysisResult.metrics?.speech_pace_wpm ?? "N/A"}
            </li>
            <li>
              Speech Clarity Score:{" "}
              {analysisResult.scores?.speech_clarity ?? "N/A"}
            </li>
            <li>
              Filler Word Count: {analysisResult.metrics?.filler_count ?? "N/A"}
            </li>
          </ul>
          {analysisResult.details?.transcript_preview && (
            <details>
              <summary>Transcript Preview</summary>
              <p>{analysisResult.details.transcript_preview}</p>
            </details>
          )}
          {/* Optionally display full JSON for debugging */}
          {/* <details>
              <summary>Full JSON Result</summary>
               <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
           </details> */}
        </div>
      );
    }
    // Initial state message
    return <p>Click "Start Recording" or upload a video to begin analysis.</p>;
  };

  // Determine if the component is busy (recording or processing)
  const isBusy = status === "recording" || status === "processing";

  return (
    <div className="analysis-container">
      <nav className="dashboard-navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            AI Communication Coach
          </Link>
          <ul className="nav-links">
            <li>
              <Link to="/dashboard" className="active">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/test-analysis">Performance Analysis</Link>
            </li>
            <li>
              <Link to="/learn">Learn & Improve</Link>
            </li>
          </ul>
          <div className="auth-buttons">
            <button className="logout-button">Logout</button>
          </div>
        </div>
      </nav>
      <h1>Analyze Your Communication Skill</h1>

      {/* Video Preview Area */}
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-preview"
          autoPlay
          muted
          playsInline
        />
        {status === "recording" && (
          <div className="recording-indicator">🔴 Recording...</div>
        )}
      </div>

      {/* Controls Area */}
      <div className="controls">
        {/* Analysis Type Selector */}
        <div className="analysis-type-selector">
          <label htmlFor="analysis-type">Analyze For:</label>
          <select
            id="analysis-type"
            value={analysisType}
            onChange={handleAnalysisTypeChange}
            disabled={isBusy}
            className="dropdown"
          >
            <option value="interview">Interview</option>
            <option value="presentation">Presentation</option>
            <option value="personal">Personal</option>
          </select>
        </div>

        {/* Recording Buttons */}
        <div>
          <button
            onClick={status === "recording" ? stopRecording : startRecording}
            disabled={isBusy && status !== "recording"}
            className={status === "recording" ? "stop-button" : "start-button"}
          >
            {status === "recording" ? "Stop Recording" : "Start Recording"}
          </button>
        </div>

        {/* File Upload Buttons */}
        <div>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            style={{ display: "none" }}
            disabled={isBusy}
          />
          {/* Button to trigger file input */}
          <button
            onClick={triggerFileInput}
            disabled={isBusy}
            className="upload-button"
          >
            Upload Video File
          </button>

          {/* Button to analyze the selected file (only shown if a file is selected and not busy) */}
          {selectedFile && status !== "processing" && (
            <button
              onClick={handleAnalyzeUploadedFile}
              disabled={isBusy}
              className="analyze-button"
            >
              Analyze "{selectedFile.name}"
            </button>
          )}
        </div>
        {selectedFile && status !== "processing" && (
          <p className="selected-file-info">
            File ready for analysis: {selectedFile.name}
          </p>
        )}
      </div>

      {/* Feedback Area */}
      <div className="feedback-area">
        <h2>Feedback</h2>
        {/* Render feedback message or results */}
        {renderFeedback()}
      </div>
    </div>
  );
}

export default AnalysisUploader;
