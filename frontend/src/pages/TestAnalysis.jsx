import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./TestAnalysis.css"; // Optional: Add some basic CSS

function TestAnalysis() {
  // State Variables
  const [status, setStatus] = useState("idle"); // idle, recording, uploading, processing, success, error
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // For uploaded file
  const [analysisType, setAnalysisType] = useState("interview"); // Default selection

  // Refs for media handling
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);
  const videoRef = useRef(null); // For live preview
  const streamRef = useRef(null);
  const fileInputRef = useRef(null); // To trigger file input programmatically

  // --- Recording Logic ---

  const startRecording = async () => {
    if (status === "recording") return; // Prevent double-clicks

    setStatus("recording");
    setError(null);
    setAnalysisResult(null);
    setSelectedFile(null); // Clear any selected file
    recordedChunks.current = []; // Reset chunks

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream; // Store stream for cleanup

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to prevent feedback loop
        videoRef.current.play().catch(console.error); // Start playing the preview
      }

      // Choose a MIME type supported by the browser and backend
      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      try {
        mediaRecorder.current = new MediaRecorder(stream, options);
      } catch (e1) {
        console.warn("WebM with VP8/Opus failed, trying default:", e1.message);
        try {
          // Fallback to browser default (often webm/vp9 or mp4)
          mediaRecorder.current = new MediaRecorder(stream);
        } catch (e2) {
          console.error("MediaRecorder creation failed:", e2);
          setError(
            "Could not create MediaRecorder. Your browser might not support recording."
          );
          setStatus("error");
          stopStreamTracks(); // Clean up stream
          return;
        }
      }
      console.log("Using MIME type:", mediaRecorder.current.mimeType);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        console.log("Recording stopped, processing data...");
        const blob = new Blob(recordedChunks.current, {
          type: mediaRecorder.current.mimeType || "video/webm", // Use recorded mimeType or default
        });
        recordedChunks.current = []; // Clear chunks after creating blob
        analyzeVideo(blob, "recording.webm"); // Send data to backend
      };

      mediaRecorder.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError(
          `Recording error: ${event.error.name} - ${event.error.message}`
        );
        setStatus("error");
        stopRecording(); // Attempt to stop cleanly
      };

      mediaRecorder.current.start(1000); // Record in chunks (optional, good for streaming/memory)
      console.log("Recording started");
    } catch (err) {
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

  const stopStreamTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.log("Camera/Audio stream stopped.");
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null; // Clear preview
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && status === "recording") {
      try {
        mediaRecorder.current.stop(); // This triggers the onstop event
        // Don't set status immediately, wait for onstop to call analyzeVideo
      } catch (error) {
        console.error("Error stopping recorder:", error);
        setError("Failed to stop recording cleanly.");
        setStatus("error"); // Set error if stop fails unexpectedly
      }
    }
    stopStreamTracks(); // Stop camera tracks regardless of recorder state
  }, [status, stopStreamTracks]); // Add dependencies

  // --- Upload Logic ---

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic validation (optional, can be more robust)
      if (!file.type.startsWith("video/")) {
        setError("Invalid file type. Please select a video file.");
        setSelectedFile(null);
        event.target.value = null; // Reset file input
        return;
      }
      setSelectedFile(file);
      setError(null); // Clear previous errors
      setAnalysisResult(null); // Clear previous results
      setStatus("idle"); // Ready to analyze uploaded file
      console.log("File selected:", file.name);

      // Optional: Preview uploaded video
      // const videoURL = URL.createObjectURL(file);
      // if (videoRef.current) {
      //   videoRef.current.srcObject = null; // Ensure no stream is playing
      //   videoRef.current.src = videoURL;
      //   videoRef.current.muted = false; // Allow playback with sound
      //   videoRef.current.play().catch(console.error);
      //   // Remember to revoke URL later: URL.revokeObjectURL(videoURL);
      // }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyzeUploadedFile = () => {
    if (selectedFile) {
      analyzeVideo(selectedFile, selectedFile.name);
    } else {
      setError("No file selected to analyze.");
    }
  };

  const handleAnalysisTypeChange = (event) => {
    setAnalysisType(event.target.value);
    console.log("Analysis type selected:", event.target.value);
  };

  // --- Backend Communication ---

  const analyzeVideo = async (videoData, filename) => {
    if (!videoData) {
      setError("No video data to analyze.");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoData, filename);
    formData.append("analysis_type", analysisType); // Include analysis type

    setStatus("processing"); // Indicate upload/analysis start
    setError(null);
    setAnalysisResult(null);
    console.log(`Sending ${filename} to backend...`);

    try {
      // Make sure this URL matches your Flask backend endpoint
      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData,
        // Headers might not be needed as FormData sets Content-Type automatically
        // headers: { 'Content-Type': 'multipart/form-data' }, // Let browser set this with boundary
      });

      // Log raw response text for debugging if needed
      // const responseText = await response.text();
      // console.log("Raw backend response:", responseText);
      // const data = JSON.parse(responseText); // Parse manually if needed

      const data = await response.json(); // Assume backend sends JSON

      if (!response.ok) {
        // Try to get error message from backend response body
        const errorMsg =
          data?.error ||
          data?.message ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      console.log("Analysis successful:", data);
      setAnalysisResult(data); // Store the full JSON result
      setStatus("success");
    } catch (err) {
      console.error("Error sending data to backend:", err);
      // More specific error handling
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Network Error: Could not connect to the analysis server. Is it running?"
        );
      } else {
        setError(`Analysis Failed: ${err.message}`);
      }
      setStatus("error");
      setAnalysisResult(null); // Clear results on error
    } finally {
      // Clean up selected file state? Maybe not, user might want to retry.
      // setSelectedFile(null); // Uncomment if you want to clear selection after attempt
      if (fileInputRef.current) fileInputRef.current.value = null; // Reset file input visually
    }
  };

  // --- Effect for Cleanup ---
  useEffect(() => {
    // This function will be called when the component unmounts
    return () => {
      console.log("TestAnalysis unmounting - cleaning up...");
      stopStreamTracks(); // Ensure camera is off
      if (
        mediaRecorder.current &&
        mediaRecorder.current.state === "recording"
      ) {
        mediaRecorder.current.stop();
      }
      // If previewing uploaded files with createObjectURL, revoke here:
      // if (videoRef.current && videoRef.current.src.startsWith('blob:')) {
      //   URL.revokeObjectURL(videoRef.current.src);
      // }
    };
  }, [stopStreamTracks]); // Add stopStreamTracks to dependency array

  // --- Render Logic ---

  const renderFeedback = () => {
    if (status === "processing") {
      return <p>Analyzing video, please wait...</p>;
    }
    if (status === "error") {
      return (
        <p className="error-message">
          Error: {error || "An unknown error occurred."}
        </p>
      );
    }
    if (status === "success" && analysisResult) {
      return (
        <div className="feedback-results">
          <h3>Analysis Results:</h3>
          <p>
            <strong>
              {analysisResult.feedback_summary || "Analysis Complete."}
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
              Body Posture Score:{" "}
              {analysisResult.scores?.body_posture_mediapipe ?? "N/A"}
            </li>
            <li>
              Speech Pace Score: {analysisResult.scores?.speech_pace ?? "N/A"}
            </li>
            <li>
              Speech Clarity (Fillers) Score:{" "}
              {analysisResult.scores?.speech_clarity_fillers ?? "N/A"}
            </li>
          </ul>
          {analysisResult.details?.transcript_preview && (
            <details>
              <summary>Transcript Preview</summary>
              <p>{analysisResult.details.transcript_preview}</p>
            </details>
          )}
        </div>
      );
    }
    return <p>Click "Start Recording" or upload a video to begin analysis.</p>; // Initial state
  };

  const isBusy = status === "recording" || status === "processing";

  return (
    <>
      <nav className="navbar">
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/test-analysis">Test Analysis</Link>
          </li>
          <li>
            <Link to="/learn">Learn</Link>
          </li>
        </ul>
      </nav>
      <div className="test-analysis-container">
        <h1> Analyze your Communication Skill</h1>

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

          <button
            onClick={status === "recording" ? stopRecording : startRecording}
            disabled={isBusy && status !== "recording"}
          >
            {status === "recording" ? "Stop Recording" : "Start Recording"}
          </button>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*" // Accept any video type
            style={{ display: "none" }}
            disabled={isBusy}
          />
          {/* Button to trigger file input */}
          <button onClick={triggerFileInput} disabled={isBusy}>
            Upload Video File
          </button>

          {/* Button to analyze the selected file */}
          {selectedFile && status !== "processing" && (
            <button onClick={handleAnalyzeUploadedFile} disabled={isBusy}>
              Analyze "{selectedFile.name}"
            </button>
          )}
        </div>

        {/* Feedback Area */}
        <div className="feedback-area">
          <h2>Feedback</h2>
          {renderFeedback()}
        </div>
      </div>
    </>
  );
}

export default TestAnalysis;
