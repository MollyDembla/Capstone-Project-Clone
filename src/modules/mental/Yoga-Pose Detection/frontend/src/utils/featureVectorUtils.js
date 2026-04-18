/**
 * Feature vector generation utilities for pose-based ML input.
 */

import { calculateJointAngles } from "./angleUtils";

const KEYPOINT_COUNT = 17;
const KEYPOINT_FEATURES = KEYPOINT_COUNT * 2; // (x, y) per keypoint
const ANGLE_FEATURES = 8;
const MOVEMENT_FEATURES = 1;
const BODY_RATIO_FEATURES = 4;

export const FEATURE_VECTOR_LENGTH =
  KEYPOINT_FEATURES + ANGLE_FEATURES + MOVEMENT_FEATURES + BODY_RATIO_FEATURES;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeScore(kp) {
  return kp && typeof kp.score === "number" ? kp.score : 0;
}

function safeCoord(value) {
  return typeof value === "number" ? clamp(value, 0, 1) : 0;
}

function isValid(kp, minConfidence) {
  return (
    kp &&
    typeof kp.x === "number" &&
    typeof kp.y === "number" &&
    safeScore(kp) >= minConfidence
  );
}

function distance(p1, p2, minConfidence) {
  if (!isValid(p1, minConfidence) || !isValid(p2, minConfidence)) {
    return 0;
  }
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function normalizedRatio(numerator, denominator) {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }
  const ratio = numerator / denominator;
  // Maps [0, +inf) -> [0, 1) to keep model inputs bounded.
  return clamp(ratio / (1 + ratio), 0, 1);
}

function getMidpoint(k1, k2, minConfidence) {
  if (!isValid(k1, minConfidence) || !isValid(k2, minConfidence)) {
    return null;
  }
  return {
    x: (k1.x + k2.x) * 0.5,
    y: (k1.y + k2.y) * 0.5,
    score: Math.min(safeScore(k1), safeScore(k2)),
  };
}

function flattenKeypoints(keypoints, minConfidence) {
  const flat = new Array(KEYPOINT_FEATURES).fill(0);

  for (let i = 0; i < KEYPOINT_COUNT; i += 1) {
    const kp = keypoints && keypoints[i] ? keypoints[i] : null;
    const idx = i * 2;

    if (isValid(kp, minConfidence)) {
      flat[idx] = safeCoord(kp.x);
      flat[idx + 1] = safeCoord(kp.y);
    }
  }

  return flat;
}

function calculateMovementScore(
  currentKeypoints,
  previousKeypoints,
  minConfidence,
) {
  if (!Array.isArray(currentKeypoints) || !Array.isArray(previousKeypoints)) {
    return 0;
  }

  let total = 0;
  let count = 0;

  for (let i = 0; i < KEYPOINT_COUNT; i += 1) {
    const c = currentKeypoints[i];
    const p = previousKeypoints[i];

    if (!isValid(c, minConfidence) || !isValid(p, minConfidence)) {
      continue;
    }

    // Coordinates are normalized to [0,1], max 2D distance is sqrt(2).
    const d = Math.hypot(c.x - p.x, c.y - p.y) / Math.SQRT2;
    total += clamp(d, 0, 1);
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return clamp(total / count, 0, 1);
}

function calculateBodyRatios(keypoints, minConfidence) {
  // MoveNet indices
  const ls = keypoints?.[5];
  const rs = keypoints?.[6];
  const lw = keypoints?.[9];
  const rw = keypoints?.[10];
  const lh = keypoints?.[11];
  const rh = keypoints?.[12];
  const lk = keypoints?.[13];
  const rk = keypoints?.[14];
  const la = keypoints?.[15];
  const ra = keypoints?.[16];

  const shoulderWidth = distance(ls, rs, minConfidence);
  const hipWidth = distance(lh, rh, minConfidence);
  const leftLeg =
    distance(lh, lk, minConfidence) + distance(lk, la, minConfidence);
  const rightLeg =
    distance(rh, rk, minConfidence) + distance(rk, ra, minConfidence);

  const midShoulder = getMidpoint(ls, rs, minConfidence);
  const midHip = getMidpoint(lh, rh, minConfidence);
  const torsoHeight = distance(midShoulder, midHip, minConfidence);
  const avgLeg = (leftLeg + rightLeg) * 0.5;

  const armSpan = distance(lw, rw, minConfidence);
  const bodyHeight = torsoHeight + avgLeg;

  return [
    // 0 shoulder/hip width
    normalizedRatio(shoulderWidth, hipWidth),
    // 1 torso/leg length
    normalizedRatio(torsoHeight, avgLeg),
    // 2 arm-span/body-height
    normalizedRatio(armSpan, bodyHeight),
    // 3 left/right leg balance
    normalizedRatio(leftLeg, rightLeg),
  ];
}

/**
 * Generate a fixed-length, normalized feature vector from pose data.
 *
 * Output structure:
 * - Flattened keypoints (17 * [x,y] = 34)
 * - Joint angles normalized to [0,1] (8 values)
 * - Movement score from previous frame (1 value)
 * - Body ratios normalized to [0,1] (4 values)
 *
 * Total length: 47
 *
 * @param {Object} params
 * @param {Array<Object>} params.keypoints Current MoveNet keypoints
 * @param {Array<Object>|null} [params.previousKeypoints=null] Previous frame keypoints
 * @param {number[]} [params.angles] Optional precomputed angles in degrees
 * @param {number} [params.minConfidence=0.3] Confidence threshold
 * @returns {number[]} Feature vector ready for ML model input
 */
export function generatePoseFeatureVector({
  keypoints,
  previousKeypoints = null,
  angles,
  minConfidence = 0.3,
}) {
  const safeKeypoints = Array.isArray(keypoints) ? keypoints : [];

  const keypointFeatures = flattenKeypoints(safeKeypoints, minConfidence);

  const angleDegrees = Array.isArray(angles)
    ? angles.slice(0, ANGLE_FEATURES)
    : calculateJointAngles(safeKeypoints, minConfidence);

  const angleFeatures = new Array(ANGLE_FEATURES).fill(0);
  for (let i = 0; i < ANGLE_FEATURES; i += 1) {
    const deg = typeof angleDegrees[i] === "number" ? angleDegrees[i] : 0;
    angleFeatures[i] = clamp(deg / 180, 0, 1);
  }

  const movementScore = calculateMovementScore(
    safeKeypoints,
    previousKeypoints,
    minConfidence,
  );

  const bodyRatios = calculateBodyRatios(safeKeypoints, minConfidence);

  return [...keypointFeatures, ...angleFeatures, movementScore, ...bodyRatios];
}
