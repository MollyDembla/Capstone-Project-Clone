/**
 * Frame-level storage and post-processing utilities for yoga step analysis.
 */

const STEP_ORDER = ["step1", "step2", "step3"];
const STEP_SET = new Set(STEP_ORDER);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeStep(step) {
  if (typeof step !== "string") {
    return "";
  }

  const s = step.trim().toLowerCase();
  if (s === "step1" || s === "step_1") return "step1";
  if (s === "step2" || s === "step_2") return "step2";
  if (s === "step3" || s === "step_3") return "step3";
  return s;
}

function normalizeAngles(angles) {
  const output = new Array(8).fill(0);

  if (!Array.isArray(angles)) {
    return output;
  }

  for (let i = 0; i < 8; i += 1) {
    output[i] = toNumber(angles[i], 0);
  }

  return output;
}

/**
 * Create a normalized frame record.
 *
 * @param {Object} frame
 * @param {number} frame.timestamp
 * @param {string} frame.step
 * @param {string} frame.prediction
 * @param {number} frame.confidence
 * @param {number[]} frame.angles
 * @param {number} frame.movementScore
 * @returns {Object}
 */
export function createFrameRecord(frame) {
  const step = normalizeStep(frame?.step);

  return {
    timestamp: toNumber(frame?.timestamp, Date.now()),
    step,
    prediction:
      typeof frame?.prediction === "string"
        ? frame.prediction.toLowerCase()
        : "incorrect",
    confidence: clamp(toNumber(frame?.confidence, 0), 0, 1),
    angles: normalizeAngles(frame?.angles),
    movementScore: clamp(toNumber(frame?.movementScore, 0), 0, 1),
  };
}

/**
 * Store frame-level data as it arrives.
 */
export class FrameDataStore {
  constructor() {
    this.frames = [];
  }

  /**
   * Add a frame-level entry.
   * @param {Object} frameData
   * @returns {Object} normalized stored frame
   */
  addFrame(frameData) {
    const frame = createFrameRecord(frameData);
    this.frames.push(frame);
    return frame;
  }

  /**
   * Get stored frames (copy).
   * @returns {Object[]}
   */
  getFrames() {
    return this.frames.slice();
  }

  /**
   * Clear all stored frames.
   */
  clear() {
    this.frames = [];
  }
}

/**
 * Remove noisy frames based on movement score.
 *
 * @param {Object[]} frames
 * @param {number} movementThreshold frames above this threshold are dropped
 * @returns {Object[]}
 */
export function removeNoisyFrames(frames, movementThreshold = 0.2) {
  if (!Array.isArray(frames) || frames.length === 0) {
    return [];
  }

  const threshold = clamp(toNumber(movementThreshold, 0.2), 0, 1);

  return frames.filter((frame) => {
    if (!STEP_SET.has(normalizeStep(frame?.step))) {
      return false;
    }
    return toNumber(frame?.movementScore, 1) <= threshold;
  });
}

/**
 * Group consecutive frames into step segments.
 *
 * @param {Object[]} frames expected filtered, step-labeled frames
 * @returns {Object[]} segments: [{step, frames, startTime, endTime, length}]
 */
export function groupFramesIntoStepSegments(frames) {
  if (!Array.isArray(frames) || frames.length === 0) {
    return [];
  }

  const sorted = frames
    .slice()
    .sort((a, b) => toNumber(a.timestamp, 0) - toNumber(b.timestamp, 0));

  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < sorted.length; i += 1) {
    const frame = createFrameRecord(sorted[i]);
    if (!STEP_SET.has(frame.step)) {
      continue;
    }

    if (!currentSegment || currentSegment.step !== frame.step) {
      if (currentSegment) {
        currentSegment.endTime =
          currentSegment.frames[currentSegment.frames.length - 1].timestamp;
        currentSegment.length = currentSegment.frames.length;
        segments.push(currentSegment);
      }

      currentSegment = {
        step: frame.step,
        frames: [frame],
        startTime: frame.timestamp,
        endTime: frame.timestamp,
        length: 1,
      };
      continue;
    }

    currentSegment.frames.push(frame);
  }

  if (currentSegment) {
    currentSegment.endTime =
      currentSegment.frames[currentSegment.frames.length - 1].timestamp;
    currentSegment.length = currentSegment.frames.length;
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Select longest stable segment for each step.
 *
 * Ties are resolved by higher mean confidence.
 *
 * @param {Object[]} segments
 * @returns {{step1:Object|null, step2:Object|null, step3:Object|null}}
 */
export function selectLongestStableSegmentPerStep(segments) {
  const byStep = {
    step1: null,
    step2: null,
    step3: null,
  };

  if (!Array.isArray(segments) || segments.length === 0) {
    return byStep;
  }

  const avgConfidence = (segment) => {
    if (
      !segment ||
      !Array.isArray(segment.frames) ||
      segment.frames.length === 0
    ) {
      return 0;
    }
    const sum = segment.frames.reduce(
      (acc, frame) => acc + clamp(toNumber(frame.confidence, 0), 0, 1),
      0,
    );
    return sum / segment.frames.length;
  };

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const step = normalizeStep(seg?.step);
    if (!STEP_SET.has(step)) {
      continue;
    }

    const best = byStep[step];
    if (!best) {
      byStep[step] = seg;
      continue;
    }

    if (seg.length > best.length) {
      byStep[step] = seg;
      continue;
    }

    if (
      seg.length === best.length &&
      avgConfidence(seg) > avgConfidence(best)
    ) {
      byStep[step] = seg;
    }
  }

  return byStep;
}

/**
 * Extract one significant frame (middle frame) from each selected step segment.
 *
 * @param {{step1:Object|null, step2:Object|null, step3:Object|null}} selectedSegments
 * @returns {(Object|null)[]} ordered: [step1Frame, step2Frame, step3Frame]
 */
export function extractSignificantFrames(selectedSegments) {
  return STEP_ORDER.map((step) => {
    const segment = selectedSegments?.[step] ?? null;
    if (
      !segment ||
      !Array.isArray(segment.frames) ||
      segment.frames.length === 0
    ) {
      return null;
    }

    const middleIndex = Math.floor(segment.frames.length / 2);
    return segment.frames[middleIndex] ?? null;
  });
}

/**
 * End-to-end frame post-processing pipeline.
 *
 * 1) Remove noisy frames
 * 2) Group by step segments
 * 3) Select longest stable segment per step
 * 4) Extract middle frame per step
 *
 * @param {Object[]} frames
 * @param {Object} options
 * @param {number} [options.movementThreshold=0.2]
 * @returns {(Object|null)[]} final 3 frames: [step1, step2, step3]
 */
export function selectFinalFramesPerStep(
  frames,
  { movementThreshold = 0.2 } = {},
) {
  const denoised = removeNoisyFrames(frames, movementThreshold);
  const segments = groupFramesIntoStepSegments(denoised);
  const longestByStep = selectLongestStableSegmentPerStep(segments);
  return extractSignificantFrames(longestByStep);
}
