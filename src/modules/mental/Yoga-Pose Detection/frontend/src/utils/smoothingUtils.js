/**
 * Keypoint smoothing utilities for real-time pose detection.
 */

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Smooth keypoints with Exponential Moving Average (EMA).
 *
 * Rules:
 * - Smoothing is applied per keypoint on x/y coordinates.
 * - Keypoints below minConfidence are ignored for EMA updates.
 * - MoveNet keypoint structure is preserved by copying all original fields.
 *
 * @param {Array<Object>} currentKeypoints - Current frame keypoints (MoveNet format)
 * @param {Array<Object>|null} previousSmoothedKeypoints - Previous smoothed keypoints
 * @param {number} alpha - EMA factor (recommended 0.2 to 0.5)
 * @param {number} minConfidence - Confidence threshold to include keypoint in smoothing
 * @returns {Array<Object>} Smoothed keypoints
 */
export function smoothKeypointsEMA(
  currentKeypoints,
  previousSmoothedKeypoints,
  alpha = 0.3,
  minConfidence = 0.3,
) {
  if (!Array.isArray(currentKeypoints) || currentKeypoints.length === 0) {
    return [];
  }

  const safeAlpha = clamp(alpha, 0, 1);
  const prev = Array.isArray(previousSmoothedKeypoints)
    ? previousSmoothedKeypoints
    : null;

  const output = new Array(currentKeypoints.length);

  for (let i = 0; i < currentKeypoints.length; i += 1) {
    const current = currentKeypoints[i];
    const previous = prev && prev[i] ? prev[i] : null;

    if (
      !current ||
      typeof current.x !== "number" ||
      typeof current.y !== "number"
    ) {
      output[i] = previous ? { ...previous } : current;
      continue;
    }

    const score = typeof current.score === "number" ? current.score : 0;

    if (
      !previous ||
      typeof previous.x !== "number" ||
      typeof previous.y !== "number"
    ) {
      output[i] = { ...current };
      continue;
    }

    if (score < minConfidence) {
      // Ignore low-confidence updates and keep stable coordinates from history.
      output[i] = {
        ...current,
        x: previous.x,
        y: previous.y,
      };
      continue;
    }

    output[i] = {
      ...current,
      x: safeAlpha * current.x + (1 - safeAlpha) * previous.x,
      y: safeAlpha * current.y + (1 - safeAlpha) * previous.y,
    };
  }

  return output;
}
