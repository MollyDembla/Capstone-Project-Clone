/**
 * Timing metrics utilities for yoga step progression.
 */

import { selectFinalFramesPerStep } from "./frameSelectionUtils";

function toNumber(value, fallback = null) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeIdealTimings(idealTimings = {}) {
  return {
    step1Time: toNumber(idealTimings.step1Time, 0),
    step2Time: toNumber(idealTimings.step2Time, null),
    step3Time: toNumber(idealTimings.step3Time, null),
  };
}

function normalizeFinalFrames(finalFrames) {
  if (Array.isArray(finalFrames)) {
    return {
      step1: finalFrames[0] ?? null,
      step2: finalFrames[1] ?? null,
      step3: finalFrames[2] ?? null,
    };
  }

  if (finalFrames && typeof finalFrames === "object") {
    return {
      step1: finalFrames.step1 ?? null,
      step2: finalFrames.step2 ?? null,
      step3: finalFrames.step3 ?? null,
    };
  }

  return {
    step1: null,
    step2: null,
    step3: null,
  };
}

function computeStepTimesFromReference(framesByStep) {
  const t1 = toNumber(framesByStep.step1?.timestamp, null);
  const t2 = toNumber(framesByStep.step2?.timestamp, null);
  const t3 = toNumber(framesByStep.step3?.timestamp, null);

  if (t1 == null) {
    return {
      referenceTimestamp: null,
      step1Time: null,
      step2Time: null,
      step3Time: null,
    };
  }

  return {
    referenceTimestamp: t1,
    step1Time: 0,
    step2Time: t2 == null ? null : t2 - t1,
    step3Time: t3 == null ? null : t3 - t1,
  };
}

function computeDelay(actualValue, idealValue) {
  if (actualValue == null || idealValue == null) {
    return null;
  }
  return actualValue - idealValue;
}

function classifyDelay(delayMs, toleranceMs) {
  if (delayMs == null) {
    return "missing";
  }

  if (Math.abs(delayMs) <= toleranceMs) {
    return "on_time";
  }

  return delayMs > 0 ? "late" : "early";
}

/**
 * Compute timing report from final frames and ideal timing JSON.
 *
 * Reference timestamp is the first detected step1 frame.
 * step1Time/step2Time/step3Time are elapsed milliseconds from that reference.
 *
 * @param {(Object[]|Object)} finalFrames
 * Array format: [step1Frame, step2Frame, step3Frame]
 * Object format: {step1, step2, step3}
 *
 * @param {Object} idealTimings JSON with keys: step1Time, step2Time, step3Time (ms)
 * @param {Object} options
 * @param {number} [options.toleranceMs=150]
 * @returns {Object} structured timing report
 */
export function computeTimingReport(
  finalFrames,
  idealTimings,
  { toleranceMs = 150 } = {},
) {
  const framesByStep = normalizeFinalFrames(finalFrames);
  const actual = computeStepTimesFromReference(framesByStep);
  const ideal = normalizeIdealTimings(idealTimings);

  const delays = {
    step1Delay: computeDelay(actual.step1Time, ideal.step1Time),
    step2Delay: computeDelay(actual.step2Time, ideal.step2Time),
    step3Delay: computeDelay(actual.step3Time, ideal.step3Time),
  };

  return {
    referenceTimestamp: actual.referenceTimestamp,
    timings: {
      step1Time: actual.step1Time,
      step2Time: actual.step2Time,
      step3Time: actual.step3Time,
    },
    idealTimings: ideal,
    delays,
    delayStatus: {
      step1: classifyDelay(delays.step1Delay, toleranceMs),
      step2: classifyDelay(delays.step2Delay, toleranceMs),
      step3: classifyDelay(delays.step3Delay, toleranceMs),
    },
    hasAllSteps:
      framesByStep.step1 != null &&
      framesByStep.step2 != null &&
      framesByStep.step3 != null,
  };
}

/**
 * Convenience helper: run frame selection + timing report in one call.
 *
 * @param {Object[]} frames raw frame-level records
 * @param {Object} idealTimings JSON with ideal step timings
 * @param {Object} options
 * @param {number} [options.movementThreshold=0.2]
 * @param {number} [options.toleranceMs=150]
 * @returns {{finalFrames:(Object|null)[], timingReport:Object}}
 */
export function buildTimingReportFromFrames(
  frames,
  idealTimings,
  { movementThreshold = 0.2, toleranceMs = 150 } = {},
) {
  const finalFrames = selectFinalFramesPerStep(frames, { movementThreshold });
  const timingReport = computeTimingReport(finalFrames, idealTimings, {
    toleranceMs,
  });

  return {
    finalFrames,
    timingReport,
  };
}
