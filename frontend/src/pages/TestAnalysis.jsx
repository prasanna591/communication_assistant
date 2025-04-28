import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./TestAnalysis.css";

function TestAnalysis() {
  const [status, setStatus] = useState("idle");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisType, setAnalysisType] = useState("interview");

  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
    if (status === "recording") return;

    setStatus("recording");
    setError(null);
    setAnalysisResult(null);
    setSelectedFile(null);
    recordedChunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.error);
      }

      const options = { mimeType: "video/webm;codecs=vp8,opus" };
      try {
        mediaRecorder.current = new MediaRecorder(stream, options);
      } catch (e1) {
        console.warn("WebM with VP8/Opus failed, trying default:", e1.message);
        try {
          mediaRecorder.current = new MediaRecorder(stream);
        } catch (e2) {
          console.error("MediaRecorder creation failed:", e2);
          setError(
            "Could not create MediaRecorder. Your browser might not support recording."
          );
          setStatus("error");
          stopStreamTracks();
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
          type: mediaRecorder.current.mimeType || "video/webm",
        });
        recordedChunks.current = [];
        analyzeVideo(blob, "recording.webm");
      };

      mediaRecorder.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setError(
          `Recording error: ${event.error.name} - ${event.error.message}`
        );
        setStatus("error");
        stopRecording();
      };

      mediaRecorder.current.start(1000);
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
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && status === "recording") {
      try {
        mediaRecorder.current.stop();
      } catch (error) {
        console.error("Error stopping recorder:", error);
        setError("Failed to stop recording cleanly.");
        setStatus("error");
      }
    }
    stopStreamTracks();
  }, [status, stopStreamTracks]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Invalid file type. Please select a video file.");
        setSelectedFile(null);
        event.target.value = null;
        return;
      }
      setSelectedFile(file);
      setError(null);
      setAnalysisResult(null);
      setStatus("idle");
      console.log("File selected:", file.name);
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

  const analyzeVideo = async (videoData, filename) => {
    if (!videoData) {
      setError("No video data to analyze.");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoData, filename);
    formData.append("analysis_type", analysisType);

    setStatus("processing"); // Indicate upload/analysis start
    setError(null);
    setAnalysisResult(null);
    console.log(`Sending ${filename} to backend...`);

    try {
      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.error ||
          data?.message ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      console.log("Analysis successful:", data);
      setAnalysisResult(data);
      setStatus("success");
    } catch (err) {
      console.error("Error sending data to backend:", err);

      if (err.message.includes("Failed to fetch")) {
        setError(
          "Network Error: Could not connect to the analysis server. Is it running?"
        );
      } else {
        setError(`Analysis Failed: ${err.message}`);
      }
      setStatus("error");
      setAnalysisResult(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  useEffect(() => {
    return () => {
      console.log("TestAnalysis unmounting - cleaning up...");
      stopStreamTracks(); // Ensure camera is off
      if (
        mediaRecorder.current &&
        mediaRecorder.current.state === "recording"
      ) {
        mediaRecorder.current.stop();
      }
    };
  }, [stopStreamTracks]);

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
              Speech Pace Score:{" "}
              {analysisResult.metrics?.speech_pace_wpm ?? "N/A"}
            </li>
            <li>
              Speech Clarity Score:{" "}
              {analysisResult.scores?.speech_clarity ?? "N/A"}
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
