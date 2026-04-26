/**
 * Custom Hook for Real-time Pose Detection
 * Handles MoveNet Lightning model loading and inference
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { smoothKeypointsEMA } from "../utils/smoothingUtils";

/**
 * usePoseDetection Hook
 * Manages MoveNet model loading, video processing, and keypoint extraction
 *
 * @param {HTMLVideoElement} videoElement - The video element to process
 * @param {Function} onKeypointsDetected - Callback when keypoints are detected
 * @param {Object} options - Configuration options
 * @returns {Object} Hook state and methods
 */
export function usePoseDetection(
  videoElement,
  onKeypointsDetected,
  options = {},
) {
  // Defaults
  const {
    modelType = "lite", // 'lite' or 'full'
    frameSkip = 1, // Process every Nth frame (1 = every frame)
    minConfidence = 0.5,
    targetFPS = 30,
    emaAlpha = 0.3,
    emaMinConfidence = 0.3,
  } = options;

  // State
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);

  // Refs
  const detectorRef = useRef(null);
  const animationIdRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsIntervalRef = useRef(Date.now());
  const frameCountForFpsRef = useRef(0);
  const previousSmoothedKeypointsRef = useRef(null);

  /**
   * Initialize MoveNet model
   */
  const initializeModel = useCallback(async () => {
    try {
      setError(null);
      console.log("Initializing MoveNet model...");

      // Force a stable backend for webcam texture handling.
      // WebGPU can fail on some Windows/browser GPU combinations.
      const availableBackends = tf.engine().registryFactory
        ? Object.keys(tf.engine().registryFactory)
        : [];

      if (availableBackends.includes("webgl")) {
        await tf.setBackend("webgl");
      } else {
        await tf.setBackend("cpu");
      }

      // Ensure TensorFlow.js backend is ready
      await tf.ready();
      console.log(`TensorFlow backend: ${tf.getBackend()}`);

      // Create detector with MoveNet Lightning
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType[modelType.toUpperCase()],
        },
      );

      detectorRef.current = detector;
      setIsModelLoaded(true);
      console.log("MoveNet model loaded successfully");
    } catch (err) {
      const errorMessage = `Model initialization failed: ${err.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      setIsModelLoaded(false);
    }
  }, [modelType]);

  /**
   * Normalize keypoints to 0-1 range
   * @param {Array} poses - MoveNet poses output
   * @param {number} videoWidth - Video width in pixels
   * @param {number} videoHeight - Video height in pixels
   * @returns {Array} Normalized keypoints [{x, y, score}, ...]
   */
  const normalizeKeypoints = useCallback((poses, videoWidth, videoHeight) => {
    if (!poses || poses.length === 0) {
      return [];
    }

    const pose = poses[0]; // Get first detected person

    return pose.keypoints.map((keypoint) => ({
      x: keypoint.x / videoWidth, // Normalize to 0-1
      y: keypoint.y / videoHeight, // Normalize to 0-1
      score: keypoint.score || 0, // Confidence score
    }));
  }, []);

  /**
   * Detect pose from video frame
   */
  const detectPose = useCallback(async () => {
    // Properly validate video element is ready
    if (
      !videoElement ||
      !detectorRef.current ||
      videoElement.readyState < 2 ||
      !videoElement.videoWidth ||
      !videoElement.videoHeight
    ) {
      return;
    }

    try {
      // Run pose detection
      const poses = await detectorRef.current.estimatePoses(videoElement);

      // Normalize keypoints
      const normalizedKeypoints = normalizeKeypoints(
        poses,
        videoElement.videoWidth,
        videoElement.videoHeight,
      );

      // Filter keypoints by confidence threshold
      const filteredKeypoints = normalizedKeypoints.map((kp) => ({
        ...kp,
        visible: kp.score >= minConfidence,
      }));

      // Apply EMA smoothing for stable real-time keypoints
      const smoothedKeypoints = smoothKeypointsEMA(
        filteredKeypoints,
        previousSmoothedKeypointsRef.current,
        emaAlpha,
        emaMinConfidence,
      );
      previousSmoothedKeypointsRef.current = smoothedKeypoints;

      // Callback with detected keypoints
      if (onKeypointsDetected) {
        onKeypointsDetected(smoothedKeypoints);
      }

      // Update FPS counter
      calculateFPS();
    } catch (err) {
      console.error("Pose detection error:", err);
      setError(`Detection error: ${err.message}`);
    }
  }, [
    videoElement,
    minConfidence,
    onKeypointsDetected,
    normalizeKeypoints,
    emaAlpha,
    emaMinConfidence,
  ]);

  /**
   * Calculate frames per second
   */
  const calculateFPS = useCallback(() => {
    frameCountForFpsRef.current += 1;
    const currentTime = Date.now();
    const elapsed = currentTime - fpsIntervalRef.current;

    // Update FPS every 500ms
    if (elapsed > 500) {
      const calculatedFps = (frameCountForFpsRef.current / elapsed) * 1000;
      setFps(calculatedFps);
      frameCountForFpsRef.current = 0;
      fpsIntervalRef.current = currentTime;
    }
  }, []);

  /**
   * Main animation loop (30 FPS target)
   */
  const animationLoop = useCallback(async () => {
    const now = Date.now();
    const frameTime = 1000 / targetFPS; // Frame time in milliseconds

    // Frame skipping for performance control
    frameCountRef.current += 1;

    if (frameCountRef.current % frameSkip === 0) {
      await detectPose();
    }

    // Schedule next frame
    animationIdRef.current = requestAnimationFrame(animationLoop);
  }, [detectPose, frameSkip, targetFPS]);

  /**
   * Start pose detection
   */
  const startDetection = useCallback(async () => {
    try {
      if (!isModelLoaded) {
        await initializeModel();
      }

      // Validate video element is ready with proper state
      if (
        !videoElement ||
        videoElement.readyState < 2 ||
        !videoElement.videoWidth ||
        !videoElement.videoHeight
      ) {
        // Try waiting a bit more for video to be ready
        console.log(
          "Video not ready yet, waiting...",
          `readyState: ${videoElement?.readyState}, width: ${videoElement?.videoWidth}, height: ${videoElement?.videoHeight}`,
        );

        // Wait up to 3 seconds for video to be ready
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 15; // 15 * 200ms = 3 seconds

          const checkVideoReady = () => {
            attempts++;

            if (
              videoElement &&
              videoElement.readyState >= 2 &&
              videoElement.videoWidth &&
              videoElement.videoHeight
            ) {
              console.log("Video is now ready!");
              setIsDetecting(true);
              setError(null);
              animationIdRef.current = requestAnimationFrame(animationLoop);
              resolve();
            } else if (attempts < maxAttempts) {
              setTimeout(checkVideoReady, 200);
            } else {
              const errorMsg = `Video element is not ready after ${attempts * 200}ms (readyState: ${videoElement?.readyState}, width: ${videoElement?.videoWidth}, height: ${videoElement?.videoHeight})`;
              console.error(errorMsg);
              setError(`Failed to start detection: ${errorMsg}`);
              setIsDetecting(false);
              reject(new Error(errorMsg));
            }
          };

          checkVideoReady();
        });
      }

      setIsDetecting(true);
      setError(null);
      animationIdRef.current = requestAnimationFrame(animationLoop);
    } catch (err) {
      const errorMessage = `Failed to start detection: ${err.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      setIsDetecting(false);
    }
  }, [isModelLoaded, videoElement, animationLoop, initializeModel]);

  /**
   * Stop pose detection
   */
  const stopDetection = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    setIsDetecting(false);
    frameCountRef.current = 0;
    previousSmoothedKeypointsRef.current = null;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopDetection();
      if (detectorRef.current) {
        // Dispose of model if needed
        if (detectorRef.current.dispose) {
          detectorRef.current.dispose();
        }
      }
    };
  }, [stopDetection]);

  return {
    isModelLoaded,
    isDetecting,
    error,
    fps,
    startDetection,
    stopDetection,
    initializeModel,
    detectPose,
  };
}
