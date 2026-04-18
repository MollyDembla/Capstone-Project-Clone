/**
 * TensorFlow.js step-model loading and inference utilities.
 */

import * as tf from "@tensorflow/tfjs";
import { FEATURE_VECTOR_LENGTH } from "./featureVectorUtils";

export const DEFAULT_CLASS_LABELS = ["correct", "moderate", "incorrect"];

export const DEFAULT_MODEL_PATHS = {
  1: "/models/step1_model/model.json",
  2: "/models/step2_model/model.json",
  3: "/models/step3_model/model.json",
};

function normalizeStep(step) {
  if (typeof step === "number") {
    return step;
  }

  if (typeof step === "string") {
    const trimmed = step.trim().toLowerCase();
    if (trimmed === "step1" || trimmed === "step_1") return 1;
    if (trimmed === "step2" || trimmed === "step_2") return 2;
    if (trimmed === "step3" || trimmed === "step_3") return 3;

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }

  return NaN;
}

function argMax(values) {
  let bestIndex = 0;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < values.length; i += 1) {
    if (values[i] > bestValue) {
      bestValue = values[i];
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Step-aware TF.js model manager.
 *
 * Loads three models asynchronously and performs prediction with the model
 * corresponding to the current step.
 */
export class StepModelManager {
  /**
   * @param {Object} options
   * @param {Object} [options.modelPaths] Paths by step number (1/2/3)
   * @param {string[]} [options.classLabels] Class labels by output index
   */
  constructor({
    modelPaths = DEFAULT_MODEL_PATHS,
    classLabels = DEFAULT_CLASS_LABELS,
  } = {}) {
    this.modelPaths = modelPaths;
    this.classLabels = classLabels;

    this.models = {
      1: null,
      2: null,
      3: null,
    };

    this.loadPromise = null;
  }

  /**
   * Load all step models asynchronously.
   * Safe to call multiple times.
   * @returns {Promise<void>}
   */
  async loadAllModels() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = Promise.all([
      tf.loadLayersModel(this.modelPaths[1]),
      tf.loadLayersModel(this.modelPaths[2]),
      tf.loadLayersModel(this.modelPaths[3]),
    ]).then(([m1, m2, m3]) => {
      this.models[1] = m1;
      this.models[2] = m2;
      this.models[3] = m3;
    });

    try {
      await this.loadPromise;
    } catch (error) {
      this.loadPromise = null;
      throw new Error(`Failed to load step models: ${error.message}`);
    }
  }

  /**
   * Predict class for a feature vector using step-specific model.
   *
   * @param {number[]} featureVector Normalized feature vector
   * @param {number|string} currentStep Step selector (1/2/3 or step1/step2/step3)
   * @returns {{label: string, confidence: number, classIndex: number, probabilities: number[]}}
   */
  predict(featureVector, currentStep) {
    const step = normalizeStep(currentStep);

    if (![1, 2, 3].includes(step)) {
      throw new Error(
        `Invalid currentStep: ${currentStep}. Expected 1, 2, or 3.`,
      );
    }

    const model = this.models[step];
    if (!model) {
      throw new Error(
        `Model for step ${step} is not loaded. Call loadAllModels() first.`,
      );
    }

    if (!Array.isArray(featureVector) || featureVector.length === 0) {
      throw new Error("featureVector must be a non-empty array.");
    }

    if (featureVector.length !== FEATURE_VECTOR_LENGTH) {
      throw new Error(
        `featureVector length mismatch. Expected ${FEATURE_VECTOR_LENGTH}, got ${featureVector.length}.`,
      );
    }

    // Efficient inference: use one tensor and dispose immediately.
    const input = tf.tensor2d([featureVector], [1, featureVector.length]);

    let output;
    try {
      output = model.predict(input);
      const logits = Array.isArray(output) ? output[0] : output;
      const probabilities = Array.from(logits.dataSync());
      const classIndex = argMax(probabilities);
      const confidence = probabilities[classIndex] ?? 0;
      const label = this.classLabels[classIndex] ?? "incorrect";

      return {
        label,
        confidence,
        classIndex,
        probabilities,
      };
    } finally {
      input.dispose();
      if (Array.isArray(output)) {
        output.forEach((t) => t?.dispose && t.dispose());
      } else if (output?.dispose) {
        output.dispose();
      }
    }
  }

  /**
   * Dispose loaded models.
   */
  dispose() {
    [1, 2, 3].forEach((step) => {
      if (this.models[step]?.dispose) {
        this.models[step].dispose();
      }
      this.models[step] = null;
    });
    this.loadPromise = null;
  }
}

/**
 * Convenience factory to create and load all models.
 * @param {Object} options Same options as StepModelManager constructor
 * @returns {Promise<StepModelManager>}
 */
export async function createLoadedStepModelManager(options = {}) {
  const manager = new StepModelManager(options);
  await manager.loadAllModels();
  return manager;
}

/**
 * Convenience one-shot prediction helper.
 *
 * @param {number[]} featureVector
 * @param {number|string} currentStep
 * @param {StepModelManager} manager
 * @returns {{label: string, confidence: number, classIndex: number, probabilities: number[]}}
 */
export function predictStepClass(featureVector, currentStep, manager) {
  if (!manager || typeof manager.predict !== "function") {
    throw new Error("A valid StepModelManager instance is required.");
  }

  return manager.predict(featureVector, currentStep);
}
