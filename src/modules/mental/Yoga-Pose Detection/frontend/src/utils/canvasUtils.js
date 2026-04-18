/**
 * Canvas Drawing Utilities for Pose Visualization
 * Handles drawing keypoints and skeleton on canvas
 */

// MoveNet keypoint indices and names
export const KEYPOINT_NAMES = [
  "nose", // 0
  "left_eye", // 1
  "right_eye", // 2
  "left_ear", // 3
  "right_ear", // 4
  "left_shoulder", // 5
  "right_shoulder", // 6
  "left_elbow", // 7
  "right_elbow", // 8
  "left_wrist", // 9
  "right_wrist", // 10
  "left_hip", // 11
  "right_hip", // 12
  "left_knee", // 13
  "right_knee", // 14
  "left_ankle", // 15
  "right_ankle", // 16
];

// Skeleton connections (pairs of keypoint indices to draw lines)
export const SKELETON_CONNECTIONS = [
  // Head connections
  [0, 1],
  [0, 2], // nose to eyes
  [1, 3],
  [2, 4], // eyes to ears

  // Torso connections
  [5, 6], // shoulders
  [5, 11],
  [6, 12], // shoulders to hips
  [11, 12], // hips

  // Left arm
  [5, 7],
  [7, 9], // left shoulder-elbow-wrist

  // Right arm
  [6, 8],
  [8, 10], // right shoulder-elbow-wrist

  // Left leg
  [11, 13],
  [13, 15], // left hip-knee-ankle

  // Right leg
  [12, 14],
  [14, 16], // right hip-knee-ankle
];

// Color configuration
export const COLORS = {
  keypoint: "#00FF00", // Bright green
  skeleton: "#00AA00", // Darker green
  keypointHighConfidence: "#FF6600", // Orange for high confidence
  text: "#FFFFFF", // White
  background: "rgba(0, 0, 0, 0.3)", // Semi-transparent black
};

/**
 * Draw a single keypoint on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X coordinate (0-1 normalized)
 * @param {number} y - Y coordinate (0-1 normalized)
 * @param {number} score - Confidence score (0-1)
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} minScore - Minimum confidence threshold
 */
export function drawKeypoint(
  ctx,
  x,
  y,
  score,
  canvasWidth,
  canvasHeight,
  minScore = 0.5,
) {
  // Don't draw if below confidence threshold
  if (score < minScore) {
    return;
  }

  // Convert normalized coordinates to pixel coordinates
  const pixelX = x * canvasWidth;
  const pixelY = y * canvasHeight;

  // Choose color based on confidence
  const color = score > 0.7 ? COLORS.keypointHighConfidence : COLORS.keypoint;

  // Draw circle for keypoint
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pixelX, pixelY, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw confidence label (optional, for debug)
  // Uncomment to see confidence scores
  /*
  ctx.fillStyle = COLORS.text;
  ctx.font = '12px Arial';
  ctx.fillText(score.toFixed(2), pixelX + 8, pixelY - 5);
  */
}

/**
 * Draw skeleton line between two keypoints
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x1 - Start X coordinate (0-1 normalized)
 * @param {number} y1 - Start Y coordinate (0-1 normalized)
 * @param {number} x2 - End X coordinate (0-1 normalized)
 * @param {number} y2 - End Y coordinate (0-1 normalized)
 * @param {number} score1 - Start point confidence
 * @param {number} score2 - End point confidence
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} minScore - Minimum confidence threshold
 */
export function drawSkeletonLine(
  ctx,
  x1,
  y1,
  score1,
  x2,
  y2,
  score2,
  canvasWidth,
  canvasHeight,
  minScore = 0.5,
) {
  // Don't draw if either point is below threshold
  if (score1 < minScore || score2 < minScore) {
    return;
  }

  // Convert to pixel coordinates
  const pixelX1 = x1 * canvasWidth;
  const pixelY1 = y1 * canvasHeight;
  const pixelX2 = x2 * canvasWidth;
  const pixelY2 = y2 * canvasHeight;

  // Draw line
  ctx.strokeStyle = COLORS.skeleton;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pixelX1, pixelY1);
  ctx.lineTo(pixelX2, pixelY2);
  ctx.stroke();
}

/**
 * Draw all keypoints on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} keypoints - Array of {x, y, score}
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} minScore - Minimum confidence threshold
 */
export function drawKeypoints(
  ctx,
  keypoints,
  canvasWidth,
  canvasHeight,
  minScore = 0.5,
) {
  // Draw all keypoints
  keypoints.forEach((point, index) => {
    if (point && point.x !== undefined && point.y !== undefined) {
      drawKeypoint(
        ctx,
        point.x,
        point.y,
        point.score || 0,
        canvasWidth,
        canvasHeight,
        minScore,
      );
    }
  });
}

/**
 * Draw complete skeleton (keypoints + connections)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} keypoints - Array of {x, y, score}
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} minScore - Minimum confidence threshold
 */
export function drawSkeleton(
  ctx,
  keypoints,
  canvasWidth,
  canvasHeight,
  minScore = 0.5,
) {
  // Draw skeleton connections first (so they appear behind keypoints)
  SKELETON_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const startPoint = keypoints[startIndex];
    const endPoint = keypoints[endIndex];

    if (startPoint && endPoint) {
      drawSkeletonLine(
        ctx,
        startPoint.x,
        startPoint.y,
        startPoint.score || 0,
        endPoint.x,
        endPoint.y,
        endPoint.score || 0,
        canvasWidth,
        canvasHeight,
        minScore,
      );
    }
  });

  // Then draw keypoints on top
  drawKeypoints(ctx, keypoints, canvasWidth, canvasHeight, minScore);
}

/**
 * Clear canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 */
export function clearCanvas(ctx, canvasWidth, canvasHeight) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Draw FPS counter on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} fps - Current FPS
 */
export function drawFPS(ctx, fps) {
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 16px Arial";
  ctx.fillText(`FPS: ${fps.toFixed(1)}`, 10, 30);
}

/**
 * Draw status text on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Status text
 * @param {number} y - Y position
 */
export function drawStatusText(ctx, text, y = 60) {
  ctx.fillStyle = COLORS.text;
  ctx.font = "14px Arial";
  ctx.fillText(text, 10, y);
}
