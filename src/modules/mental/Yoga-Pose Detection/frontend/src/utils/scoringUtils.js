/**
 * Scoring utilities for yoga pose evaluation.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeAccuracyToScore(accuracy) {
  const v = toNumber(accuracy, 0);
  // Supports 0-1 or 0-100 input.
  const ratio = v > 1 ? v / 100 : v;
  return clamp(ratio, 0, 1) * 100;
}

function normalizeAngleErrorToScore(angleError, maxAngleError) {
  const err = Math.max(0, toNumber(angleError, 0));
  const maxErr = Math.max(1e-6, toNumber(maxAngleError, 45));
  // 0 error -> 100 score, >= maxErr -> 0 score.
  return clamp(1 - err / maxErr, 0, 1) * 100;
}

function extractTimingDeviationMs(timingDeviation) {
  // Accepts numeric deviation (ms) directly.
  if (Number.isFinite(timingDeviation)) {
    return Math.abs(timingDeviation);
  }

  // Accepts timing report shape with delays object.
  if (timingDeviation && typeof timingDeviation === "object") {
    const source = timingDeviation.delays || timingDeviation;
    const values = [
      source.step1Delay,
      source.step2Delay,
      source.step3Delay,
      source.step1,
      source.step2,
      source.step3,
    ].filter(Number.isFinite);

    if (values.length > 0) {
      const meanAbs =
        values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
      return meanAbs;
    }
  }

  return 0;
}

function normalizeTimingDeviationToScore(
  timingDeviation,
  maxTimingDeviationMs,
) {
  const dev = extractTimingDeviationMs(timingDeviation);
  const maxDev = Math.max(1e-6, toNumber(maxTimingDeviationMs, 2000));
  // 0ms deviation -> 100 score, >= maxDev -> 0 score.
  return clamp(1 - dev / maxDev, 0, 1) * 100;
}

function normalizeStabilityToScore(stability) {
  const v = toNumber(stability, 0);
  // Supports 0-1 or 0-100 input.
  const ratio = v > 1 ? v / 100 : v;
  return clamp(ratio, 0, 1) * 100;
}

function normalizeWeights(weights = {}) {
  const raw = {
    accuracy: Math.max(0, toNumber(weights.accuracy, 0.35)),
    angle: Math.max(0, toNumber(weights.angle, 0.3)),
    timing: Math.max(0, toNumber(weights.timing, 0.2)),
    stability: Math.max(0, toNumber(weights.stability, 0.15)),
  };

  const sum = raw.accuracy + raw.angle + raw.timing + raw.stability;
  if (sum <= 0) {
    return {
      accuracy: 0.35,
      angle: 0.3,
      timing: 0.2,
      stability: 0.15,
    };
  }

  return {
    accuracy: raw.accuracy / sum,
    angle: raw.angle / sum,
    timing: raw.timing / sum,
    stability: raw.stability / sum,
  };
}

/**
 * Compute final yoga score and breakdown.
 *
 * Inputs:
 * - classificationAccuracy: ratio (0-1) or percent (0-100)
 * - angleError: average angle error in degrees
 * - timingDeviation: mean ms deviation OR timing report delay object
 * - stabilityScore: ratio (0-1) or percent (0-100)
 *
 * @param {Object} params
 * @param {number} params.classificationAccuracy
 * @param {number} params.angleError
 * @param {number|Object} params.timingDeviation
 * @param {number} params.stabilityScore
 * @param {Object} [params.config]
 * @param {number} [params.config.maxAngleError=45]
 * @param {number} [params.config.maxTimingDeviationMs=2000]
 * @param {Object} [params.config.weights]
 * @returns {{
 *   finalScore:number,
 *   breakdown:{accuracyScore:number, angleScore:number, timingScore:number, stabilityScore:number}
 * }}
 */
export function computeYogaScore({
  classificationAccuracy,
  angleError,
  timingDeviation,
  stabilityScore,
  config = {},
}) {
  const weights = normalizeWeights(config.weights);

  const accuracyScore = normalizeAccuracyToScore(classificationAccuracy);
  const angleScore = normalizeAngleErrorToScore(
    angleError,
    config.maxAngleError,
  );
  const timingScore = normalizeTimingDeviationToScore(
    timingDeviation,
    config.maxTimingDeviationMs,
  );
  const stabilityScoreNorm = normalizeStabilityToScore(stabilityScore);

  const finalScore =
    accuracyScore * weights.accuracy +
    angleScore * weights.angle +
    timingScore * weights.timing +
    stabilityScoreNorm * weights.stability;

  return {
    finalScore: Number(finalScore.toFixed(2)),
    breakdown: {
      accuracyScore: Number(accuracyScore.toFixed(2)),
      angleScore: Number(angleScore.toFixed(2)),
      timingScore: Number(timingScore.toFixed(2)),
      stabilityScore: Number(stabilityScoreNorm.toFixed(2)),
    },
  };
}
