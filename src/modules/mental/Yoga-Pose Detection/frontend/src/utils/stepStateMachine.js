/**
 * Finite state machine for yoga step progression.
 */

export const YOGA_STATES = {
  IDLE: "idle",
  STEP1: "step1",
  STEP2: "step2",
  STEP3: "step3",
  COMPLETED: "completed",
};

const STEP_SET = new Set([
  YOGA_STATES.STEP1,
  YOGA_STATES.STEP2,
  YOGA_STATES.STEP3,
]);

/**
 * Pure transition helper.
 *
 * Rules:
 * - idle -> step1
 * - step1 -> step2
 * - step2 -> step3
 * - step3 -> completed (when step3 is received again)
 * - all other transitions are ignored
 *
 * @param {string} currentState
 * @param {string} detectedStep
 * @returns {string} next state
 */
export function getNextYogaState(currentState, detectedStep) {
  if (!STEP_SET.has(detectedStep)) {
    return currentState;
  }

  if (currentState === YOGA_STATES.IDLE && detectedStep === YOGA_STATES.STEP1) {
    return YOGA_STATES.STEP1;
  }

  if (
    currentState === YOGA_STATES.STEP1 &&
    detectedStep === YOGA_STATES.STEP2
  ) {
    return YOGA_STATES.STEP2;
  }

  if (
    currentState === YOGA_STATES.STEP2 &&
    detectedStep === YOGA_STATES.STEP3
  ) {
    return YOGA_STATES.STEP3;
  }

  if (
    currentState === YOGA_STATES.STEP3 &&
    detectedStep === YOGA_STATES.STEP3
  ) {
    return YOGA_STATES.COMPLETED;
  }

  return currentState;
}

/**
 * Stateful yoga step FSM.
 */
export class YogaStepStateMachine {
  constructor() {
    this.currentStep = YOGA_STATES.IDLE;
    this.stepStartTimes = {
      [YOGA_STATES.STEP1]: null,
      [YOGA_STATES.STEP2]: null,
      [YOGA_STATES.STEP3]: null,
    };
  }

  /**
   * Update FSM with the currently detected step label.
   *
   * @param {string} detectedStep expected labels: step1, step2, step3
   * @param {number} timestamp epoch ms for current frame
   * @returns {{currentStep: string, stepStartTimes: Object}}
   */
  update(detectedStep, timestamp = Date.now()) {
    const nextState = getNextYogaState(this.currentStep, detectedStep);

    if (nextState !== this.currentStep) {
      if (STEP_SET.has(nextState) && this.stepStartTimes[nextState] == null) {
        this.stepStartTimes[nextState] = timestamp;
      }
      this.currentStep = nextState;
    }

    return this.getState();
  }

  /**
   * Read current machine snapshot.
   *
   * @returns {{currentStep: string, stepStartTimes: Object}}
   */
  getState() {
    return {
      currentStep: this.currentStep,
      stepStartTimes: { ...this.stepStartTimes },
    };
  }

  /**
   * Reset machine to idle.
   *
   * @returns {{currentStep: string, stepStartTimes: Object}}
   */
  reset() {
    this.currentStep = YOGA_STATES.IDLE;
    this.stepStartTimes = {
      [YOGA_STATES.STEP1]: null,
      [YOGA_STATES.STEP2]: null,
      [YOGA_STATES.STEP3]: null,
    };

    return this.getState();
  }
}
