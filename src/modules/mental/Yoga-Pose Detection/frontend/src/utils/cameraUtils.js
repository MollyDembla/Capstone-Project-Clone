/**
 * Camera Access Utilities
 * Handles getUserMedia and video stream management
 */

/**
 * Request user's camera access
 * @returns {Promise<MediaStream>} The media stream
 * @throws {Error} If camera access is denied or not available
 */
export async function requestCameraAccess() {
  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera access not supported by this browser");
    }

    // Request camera stream with constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user", // Front-facing camera
      },
      audio: false, // We don't need audio for pose detection
    });

    return stream;
  } catch (error) {
    // Handle specific error types
    if (error.name === "NotAllowedError") {
      throw new Error(
        "Camera permission denied. Please allow camera access in your browser settings.",
      );
    } else if (error.name === "NotFoundError") {
      throw new Error(
        "No camera device found. Please connect a camera and reload the page.",
      );
    } else if (error.name === "NotReadableError") {
      throw new Error("Camera is already in use by another application.");
    } else {
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }
}

/**
 * Stop video stream and release camera
 * @param {MediaStream} stream - The media stream to stop
 */
export function stopCameraStream(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

/**
 * Set video element source from stream
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {MediaStream} stream - The media stream
 */
export function setVideoSource(videoElement, stream) {
  if (!videoElement) {
    throw new Error("Video element is not available");
  }

  // Use srcObject for modern browsers (preferred)
  if (videoElement.srcObject !== undefined) {
    videoElement.srcObject = stream;
  } else {
    // Fallback for older browsers
    videoElement.src = URL.createObjectURL(stream);
  }
}

/**
 * Wait for video to be ready (metadata loaded and playing)
 * @param {HTMLVideoElement} videoElement - The video element
 * @returns {Promise<void>}
 */
export async function waitForVideoReady(videoElement) {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error("Video element is not available"));
      return;
    }

    let timeoutId;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      videoElement.removeEventListener("loadedmetadata", onMetadataLoaded);
      videoElement.removeEventListener("error", onError);
      videoElement.removeEventListener("canplay", onCanPlay);
    };

    const onMetadataLoaded = () => {
      // Metadata loaded, now wait for enough data to render a frame.
      console.log("Video metadata loaded");
    };

    const onCanPlay = () => {
      cleanup();
      console.log(
        `Video ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`,
      );
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Video failed to load"));
    };

    // Set timeout for loading (10 seconds)
    timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Video loading timeout (readyState: ${videoElement.readyState})`,
        ),
      );
    }, 10000);

    videoElement.addEventListener("loadedmetadata", onMetadataLoaded);
    videoElement.addEventListener("canplay", onCanPlay);
    videoElement.addEventListener("error", onError);

    // If already ready, resolve immediately.
    if (
      videoElement.readyState >= 2 &&
      videoElement.videoWidth > 0 &&
      videoElement.videoHeight > 0
    ) {
      onCanPlay();
    }
  });
}

/**
 * Get video dimensions
 * @param {HTMLVideoElement} videoElement - The video element
 * @returns {{width: number, height: number}}
 */
export function getVideoDimensions(videoElement) {
  if (!videoElement || !videoElement.videoWidth) {
    return { width: 640, height: 480 };
  }

  return {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
  };
}
