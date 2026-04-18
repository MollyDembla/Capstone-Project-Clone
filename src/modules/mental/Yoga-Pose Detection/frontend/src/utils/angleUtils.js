/**
 * Joint angle calculation utilities for MoveNet keypoints.
 */

// MoveNet indices
const KP = {
  left_shoulder: 5,
  right_shoulder: 6,
  left_elbow: 7,
  right_elbow: 8,
  left_wrist: 9,
  right_wrist: 10,
  left_hip: 11,
  right_hip: 12,
  left_knee: 13,
  right_knee: 14,
  left_ankle: 15,
  right_ankle: 16,
};

export const JOINT_ANGLE_ORDER = [
  "left_elbow", // 0
  "right_elbow", // 1
  "left_shoulder", // 2
  "right_shoulder", // 3
  "left_knee", // 4
  "right_knee", // 5
  "hip", // 6
  "spine", // 7
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isValidKeypoint(kp, minConfidence) {
  return (
    kp &&
    typeof kp.x === "number" &&
    typeof kp.y === "number" &&
    typeof kp.score === "number" &&
    kp.score >= minConfidence
  );
}

function midpoint(p1, p2) {
  if (!p1 && !p2) return null;
  if (!p1) return { ...p2 };
  if (!p2) return { ...p1 };

  return {
    x: (p1.x + p2.x) * 0.5,
    y: (p1.y + p2.y) * 0.5,
    score: Math.min(p1.score ?? 1, p2.score ?? 1),
  };
}

/**
 * Calculate angle at p2 formed by p1 -> p2 -> p3.
 * Uses vector math and returns angle in degrees.
 *
 * @param {{x:number,y:number}|null} p1
 * @param {{x:number,y:number}|null} p2
 * @param {{x:number,y:number}|null} p3
 * @returns {number} Angle in degrees (0 if invalid)
 */
export function calculateAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 0;

  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const dot = v1x * v2x + v1y * v2y;
  const cosTheta = clamp(dot / (mag1 * mag2), -1, 1);

  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Calculate fixed-order joint angles from MoveNet keypoints.
 *
 * Output order:
 * 0 left_elbow
 * 1 right_elbow
 * 2 left_shoulder
 * 3 right_shoulder
 * 4 left_knee
 * 5 right_knee
 * 6 hip
 * 7 spine
 *
 * @param {Array<Object>} keypoints MoveNet keypoints array (length 17)
 * @param {number} minConfidence Confidence threshold for valid points
 * @returns {number[]} Angles in degrees, always length 8
 */
export function calculateJointAngles(keypoints, minConfidence = 0.3) {
  const angles = new Array(8).fill(0);

  if (!Array.isArray(keypoints) || keypoints.length === 0) {
    return angles;
  }

  const get = (index) => {
    const kp = keypoints[index];
    return isValidKeypoint(kp, minConfidence) ? kp : null;
  };

  const ls = get(KP.left_shoulder);
  const rs = get(KP.right_shoulder);
  const le = get(KP.left_elbow);
  const re = get(KP.right_elbow);
  const lw = get(KP.left_wrist);
  const rw = get(KP.right_wrist);
  const lh = get(KP.left_hip);
  const rh = get(KP.right_hip);
  const lk = get(KP.left_knee);
  const rk = get(KP.right_knee);
  const la = get(KP.left_ankle);
  const ra = get(KP.right_ankle);

  const midHip = midpoint(lh, rh);
  const midShoulder = midpoint(ls, rs);

  // 0: left_elbow
  angles[0] = calculateAngle(ls, le, lw);

  // 1: right_elbow
  angles[1] = calculateAngle(rs, re, rw);

  // 2: left_shoulder
  angles[2] = calculateAngle(le, ls, lh);

  // 3: right_shoulder
  angles[3] = calculateAngle(re, rs, rh);

  // 4: left_knee
  angles[4] = calculateAngle(lh, lk, la);

  // 5: right_knee
  angles[5] = calculateAngle(rh, rk, ra);

  // 6: hip (pelvis/leg spread around center hip)
  angles[6] = calculateAngle(lk, midHip, rk);

  // 7: spine (deviation from vertical through center hip)
  const verticalRef = midHip
    ? { x: midHip.x, y: midHip.y - 1, score: midHip.score ?? 1 }
    : null;
  angles[7] = calculateAngle(midShoulder, midHip, verticalRef);

  return angles;
}

/**
 * Compare user angles against ideal angles.
 *
 * @param {number[]} userAngles 8 joint angles in degrees
 * @param {number[]} idealAngles 8 joint angles in degrees
 * @returns {{jointErrors:number[], avgError:number}}
 */
export function compareAngles(userAngles, idealAngles) {
  const JOINT_COUNT = 8;
  const jointErrors = new Array(JOINT_COUNT).fill(0);

  let sum = 0;
  for (let i = 0; i < JOINT_COUNT; i += 1) {
    const user = Number.isFinite(userAngles?.[i]) ? userAngles[i] : 0;
    const ideal = Number.isFinite(idealAngles?.[i]) ? idealAngles[i] : 0;
    const error = Math.abs(user - ideal);
    jointErrors[i] = error;
    sum += error;
  }

  return {
    jointErrors,
    avgError: sum / JOINT_COUNT,
  };
}
