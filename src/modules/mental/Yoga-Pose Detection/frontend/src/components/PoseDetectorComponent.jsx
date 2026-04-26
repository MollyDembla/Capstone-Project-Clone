/**
 * PoseDetectorComponent
 * Main React component for real-time pose detection with visualization
 *
 * Features:
 * - Real-time webcam access
 * - MoveNet Lightning pose detection
 * - 30 FPS processing loop
 * - Canvas visualization of keypoints and skeleton
 * - Error handling and status display
 */

import React, { useEffect, useRef, useState } from "react";
import { usePoseDetection } from "../hooks/usePoseDetection";
import {
  requestCameraAccess,
  stopCameraStream,
  setVideoSource,
  waitForVideoReady,
  getVideoDimensions,
} from "../utils/cameraUtils";
import {
  drawSkeleton,
  clearCanvas,
  drawFPS,
  drawStatusText,
} from "../utils/canvasUtils";
import "./PoseDetectorComponent.css";

/**
 * PoseDetectorComponent
 * @param {Function} onKeypointsUpdate - Callback when keypoints are updated
 * @param {Object} options - Component options
 */
export function PoseDetectorComponent({
  onKeypointsUpdate,
  options = {},
  isActive = false,
}) {
  // DOM References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isInitializingRef = useRef(false);

  // State
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentKeypoints, setCurrentKeypoints] = useState([]);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 640,
    height: 480,
  });
  const [videoElement, setVideoElement] = useState(null);

  // Hooks - Initialize with actual video element when ready
  const poseDetection = usePoseDetection(
    videoElement,
    handleKeypointsDetected,
    {
      modelType: options.modelType || "lite",
      frameSkip: options.frameSkip || 1,
      minConfidence: options.minConfidence || 0.5,
      targetFPS: options.targetFPS || 30,
    },
  );

  /**
   * Callback when keypoints are detected
   */
  function handleKeypointsDetected(keypoints) {
    setCurrentKeypoints(keypoints);

    // Call parent callback if provided
    if (onKeypointsUpdate) {
      onKeypointsUpdate(keypoints);
    }
  }

  /**
   * Initialize camera and start detection
   */
  async function initializeCamera() {
    if (isInitializingRef.current) {
      return;
    }

    try {
      isInitializingRef.current = true;
      setCameraError(null);

      // Request camera access
      console.log("Requesting camera access...");
      const stream = await requestCameraAccess();

      // Set video source
      setVideoSource(videoRef.current, stream);

      // Wait for video to load
      console.log("Waiting for video to load...");
      await waitForVideoReady(videoRef.current);

      // Get video dimensions
      const dims = getVideoDimensions(videoRef.current);
      setVideoDimensions(dims);
      console.log(`Video ready: ${dims.width}x${dims.height}`);

      // Now set the video element in state so hook gets the real element
      setVideoElement(videoRef.current);
      setIsCameraReady(true);

      // Aggressive Warmup: Run multiple frames to pre-compile WebGL shaders and stabilize FPS
      console.log("Warming up pose detection engine (5-frame sequence)...");
      await poseDetection.initializeModel();
      for(let i=0; i<5; i++) {
        await poseDetection.detectPose();
        await new Promise(r => setTimeout(r, 100)); // Small pause to let GPU breath
      }
      console.log("✅ Engine fully optimized and lag-free");
    } catch (error) {
      console.error("Camera initialization error:", error);
      setCameraError(error.message || "Failed to initialize camera");
      setIsCameraReady(false);
    } finally {
      isInitializingRef.current = false;
    }
  }

  /**
   * Clean up and stop detection
   */
  function cleanup() {
    poseDetection.stopDetection();
    stopCameraStream(videoRef.current?.srcObject);
    setIsCameraReady(false);
  }

  /**
   * Draw visualization on canvas
   */
  function drawVisualization() {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = videoDimensions;

    // Clear canvas
    clearCanvas(ctx, width, height);

    // Draw the live camera frame as the base layer
    if (
      videoRef.current.readyState >= 2 &&
      videoRef.current.videoWidth > 0 &&
      videoRef.current.videoHeight > 0
    ) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    }

    // Draw skeleton and keypoints (only if showSkeleton is true)
    if (options.showSkeleton && currentKeypoints.length > 0) {
      drawSkeleton(
        ctx,
        currentKeypoints,
        width,
        height,
        options.minConfidence || 0.5,
      );
    }

    // Draw debug info (only if showDebugInfo is true)
    if (options.showDebugInfo) {
      // Draw FPS
      drawFPS(ctx, poseDetection.fps);

      // Draw status text
      if (!poseDetection.isModelLoaded) {
        drawStatusText(ctx, "Loading model...", 60);
      } else if (!poseDetection.isDetecting) {
        drawStatusText(ctx, "Not detecting", 60);
      } else if (currentKeypoints.length === 0) {
        drawStatusText(ctx, "No pose detected", 60);
      } else {
        drawStatusText(ctx, `Keypoints: ${currentKeypoints.length}`, 60);
      }
    }

    // Schedule next draw
    requestAnimationFrame(drawVisualization);
  }

  /**
   * Handle canvas resize
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = videoDimensions;

      canvas.width = width;
      canvas.height = height;

      // Redraw after resize
      drawVisualization();
    };

    resizeCanvas();
  }, [videoDimensions]);

  /**
   * Handle container resize
   */
  useEffect(() => {
    const handleWindowResize = () => {
      if (containerRef.current) {
        const { offsetWidth } = containerRef.current;

        // Maintain aspect ratio
        const aspectRatio = videoDimensions.width / videoDimensions.height;
        const newHeight = Math.round(offsetWidth / aspectRatio);

        containerRef.current.style.height = `${newHeight}px`;
      }
    };

    window.addEventListener("resize", handleWindowResize);
    handleWindowResize();

    return () => window.removeEventListener("resize", handleWindowResize);
  }, [videoDimensions]);

  /**
   * Initialize on component mount
   */
  useEffect(() => {
    initializeCamera();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * Start detection once video element is ready
   */
  useEffect(() => {
    if (videoElement && isCameraReady && !poseDetection.isDetecting) {
      console.log("Starting pose detection...");
      poseDetection.startDetection();
    }
  }, [videoElement, isCameraReady, poseDetection]);

  /**
   * Start visualization loop
   */
  useEffect(() => {
    if (isCameraReady && poseDetection.isDetecting) {
      const animationId = requestAnimationFrame(drawVisualization);
      return () => cancelAnimationFrame(animationId);
    }
  }, [
    isCameraReady,
    poseDetection.isDetecting,
    currentKeypoints,
    videoDimensions,
    poseDetection.fps,
  ]);

  // Start/Stop detection based on isActive prop
  useEffect(() => {
    if (isActive && isCameraReady && !poseDetection.isDetecting) {
      poseDetection.startDetection();
    } else if (!isActive && poseDetection.isDetecting) {
      poseDetection.stopDetection();
    }
  }, [isActive, isCameraReady, poseDetection]);

  /**
   * Handle start/stop button click (manually)
   */
  function handleToggleDetection() {
    if (poseDetection.isDetecting) {
      poseDetection.stopDetection();
    } else if (isCameraReady) {
      poseDetection.startDetection();
    }
  }

  /**
   * Handle permission retry
   */
  async function handleRetryPermission() {
    await initializeCamera();
  }

  return (
    <div
      className="pose-detector-container"
      ref={containerRef}
      style={{ height: "100%", width: "100%" }}
    >
      {!options.hideUI && (
        <div className="pose-detector-header">
          <h2>Real-Time Pose Detection</h2>
          <div className="header-controls">
            {isCameraReady && (
              <button
                className={`btn ${poseDetection.isDetecting ? "btn-stop" : "btn-start"}`}
                onClick={handleToggleDetection}
                disabled={!isCameraReady}
              >
                {poseDetection.isDetecting ? "Stop" : "Start"} Detection
              </button>
            )}
            {!poseDetection.isModelLoaded && (
              <span className="status-text">Loading model...</span>
            )}
            {poseDetection.isModelLoaded &&
              !poseDetection.isDetecting &&
              isCameraReady && <span className="status-text">Ready</span>}
          </div>
        </div>
      )}

      {/* Camera error display */}
      {cameraError && (
        <div className="error-container">
          <div className="error-message">
            <h3>Camera Error</h3>
            <p>{cameraError}</p>
            <button className="btn btn-retry" onClick={handleRetryPermission}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Model loading error display */}
      {poseDetection.error && (
        <div className="error-container">
          <div className="error-message">
            <h3>Model Error</h3>
            <p>{poseDetection.error}</p>
          </div>
        </div>
      )}

      {/* Video and Canvas stack */}
      <div className="video-canvas-wrapper">
        {/* Hidden video element for processing */}
        <video
          ref={videoRef}
          className="pose-detector-video"
          autoPlay
          muted
          playsInline
          width={videoDimensions.width}
          height={videoDimensions.height}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Canvas overlay for visualization */}
        <canvas
          ref={canvasRef}
          className="pose-detector-canvas"
          width={videoDimensions.width}
          height={videoDimensions.height}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Loading state overlay */}
        {!isCameraReady && !cameraError && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Initializing camera...</p>
          </div>
        )}
      </div>

      {/* Statistics panel */}
      {!options.hideUI && (
        <div className="stats-panel">
          <div className="stat">
            <label>FPS:</label>
            <value>{poseDetection.fps.toFixed(1)}</value>
          </div>
          <div className="stat">
            <label>Keypoints Detected:</label>
            <value>{currentKeypoints.length}/17</value>
          </div>
          <div className="stat">
            <label>Model:</label>
            <value>
              {poseDetection.isModelLoaded ? "Loaded" : "Loading..."}
            </value>
          </div>
          <div className="stat">
            <label>Detection:</label>
            <value>{poseDetection.isDetecting ? "Active" : "Inactive"}</value>
          </div>
        </div>
      )}

      {/* Keypoints data display (optional debug info) */}
      {options.showDebugInfo && currentKeypoints.length > 0 && (
        <div className="debug-panel">
          <h3>Detected Keypoints</h3>
          <div className="keypoints-list">
            {currentKeypoints.map((kp, idx) => (
              <div key={idx} className="keypoint-item">
                <span className="keypoint-idx">{idx}:</span>
                <span className="keypoint-coords">
                  x={kp.x.toFixed(3)}, y={kp.y.toFixed(3)}
                </span>
                <span
                  className={`keypoint-score ${kp.score > 0.7 ? "high" : "low"}`}
                >
                  {kp.score.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PoseDetectorComponent;
