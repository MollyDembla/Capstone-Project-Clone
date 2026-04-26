"""
Dataset Generation & Model Training Pipeline — Trikonasana (Triangle Pose)
Mental Health Yoga Module — YogMitra

Pipeline:
  1. Read step-wise labeled images from Images/Step{N}/{Correct|Incorrect|Moderate}
  2. Detect keypoints per image with step-specific Trikonasana base positions
     (simulated MoveNet output with image-driven variation)
  3. Build keypoint features, joint-angle features, movement score, body-ratio features
  4. Generate one-hot class labels (Correct=0, Incorrect=1, Moderate=2)
  5. Save step datasets to  ./datasets/step_{N}_dataset.csv
  6. Validate feature consistency + angle-order metadata
  7. Train separate Keras models for step1, step2, step3
  8. Save .keras models to     ./models/step_{N}_model.keras
  9. Convert to TF.js format   ./models/step{N}_model/ (model.json + weights)
 10. Write trikonasana_config.json with ideal angles & timings
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path

warnings.filterwarnings("ignore")

# ─── Try importing TensorFlow ────────────────────────────────────────────────
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TF_AVAILABLE = True
    print(f"TensorFlow {tf.__version__} loaded.")
except ImportError:
    TF_AVAILABLE = False
    print("WARNING: TensorFlow not found. Install with: pip install tensorflow")
    sys.exit(1)

# ─── Try importing tensorflowjs for TF.js conversion ─────────────────────────
try:
    import tensorflowjs as tfjs
    TFJS_AVAILABLE = True
    print("TensorFlow.js converter available.")
except ImportError:
    TFJS_AVAILABLE = False
    print("INFO: tensorflowjs not installed. Skipping TF.js export.")
    print("      Install with: pip install tensorflowjs")

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG = {
    "image_base_path": os.path.join(BASE_DIR, "Images"),
    "output_base_path": os.path.join(BASE_DIR, "datasets"),
    "model_base_path": os.path.join(BASE_DIR, "models"),
    "tfjs_base_path": os.path.join(
        BASE_DIR, "frontend", "public", "models"
    ),
    "steps": [1, 2, 3],
    "classes": ["Correct", "Incorrect", "Moderate"],
    "class_map": {"Correct": 0, "Incorrect": 1, "Moderate": 2},
    "num_keypoints": 17,
    "pose_name": "Trikonasana",
}

# ─── MoveNet keypoint index names (17 points) ─────────────────────────────────
KEYPOINT_NAMES = [
    "nose",            # 0
    "left_eye",        # 1
    "right_eye",       # 2
    "left_ear",        # 3
    "right_ear",       # 4
    "left_shoulder",   # 5
    "right_shoulder",  # 6
    "left_elbow",      # 7
    "right_elbow",     # 8
    "left_wrist",      # 9
    "right_wrist",     # 10
    "left_hip",        # 11
    "right_hip",       # 12
    "left_knee",       # 13
    "right_knee",      # 14
    "left_ankle",      # 15
    "right_ankle",     # 16
]

# ─── Fixed joint-angle pairs (MUST match frontend angleUtils.js order) ────────
# Output order: left_elbow, right_elbow, left_shoulder, right_shoulder,
#               left_knee,  right_knee,  hip,           spine
ANGLE_PAIRS = [
    ("left_shoulder", "left_elbow",  "left_wrist"),      # 0 left_elbow
    ("right_shoulder","right_elbow", "right_wrist"),     # 1 right_elbow
    ("left_elbow",    "left_shoulder","left_hip"),       # 2 left_shoulder
    ("right_elbow",   "right_shoulder","right_hip"),     # 3 right_shoulder
    ("left_hip",      "left_knee",   "left_ankle"),      # 4 left_knee
    ("right_hip",     "right_knee",  "right_ankle"),     # 5 right_knee
    ("left_knee",     "left_hip",    "right_hip"),       # 6 hip spread
    ("nose",          "left_shoulder","left_hip"),       # 7 spine/lateral tilt
]

ANGLE_ORDER = [
    "left_elbow", "right_elbow", "left_shoulder", "right_shoulder",
    "left_knee",  "right_knee",  "hip",           "spine",
]

# ─── Trikonasana ideal angles per step ────────────────────────────────────────
TRIKONASANA_IDEAL_ANGLES = {
    "step1": [170, 170, 90, 90, 170, 170, 90, 165],
    "step2": [170, 170, 90, 90, 170, 170, 90, 145],
    "step3": [170, 170, 90, 90, 170, 170, 90, 120],
}

# ─── Trikonasana ideal step timings (ms from session start) ───────────────────
TRIKONASANA_IDEAL_TIMINGS = {
    "step1Time": 0,      # start of wide stance
    "step2Time": 5000,   # reaching / lateral bend  (~5 s)
    "step3Time": 12000,  # full triangle hold        (~12 s)
}

# ─── Trikonasana base keypoint positions PER STEP ─────────────────────────────
# Step 1: Wide stance, arms extended horizontal (Warrior-T preparation)
# Step 2: Lateral bend begins, one arm reaching downward
# Step 3: Full Triangle — one hand near ankle, opposite arm pointing to sky
TRIKONASANA_BASE_POSITIONS = {
    1: {
        "nose":           (0.50, 0.10),
        "left_eye":       (0.47, 0.09),
        "right_eye":      (0.53, 0.09),
        "left_ear":       (0.44, 0.09),
        "right_ear":      (0.56, 0.09),
        "left_shoulder":  (0.26, 0.28),  # Wide shoulder span
        "right_shoulder": (0.74, 0.28),
        "left_elbow":     (0.12, 0.30),  # Arms horizontal
        "right_elbow":    (0.88, 0.30),
        "left_wrist":     (0.02, 0.31),  # Extended fully
        "right_wrist":    (0.98, 0.31),
        "left_hip":       (0.40, 0.62),
        "right_hip":      (0.60, 0.62),
        "left_knee":      (0.30, 0.79),  # Wide leg stance
        "right_knee":     (0.70, 0.79),
        "left_ankle":     (0.22, 0.96),
        "right_ankle":    (0.78, 0.96),
    },
    2: {
        "nose":           (0.55, 0.18),  # Head starts to tilt
        "left_eye":       (0.52, 0.17),
        "right_eye":      (0.58, 0.17),
        "left_ear":       (0.49, 0.17),
        "right_ear":      (0.61, 0.18),
        "left_shoulder":  (0.35, 0.24),  # Torso tilting right
        "right_shoulder": (0.74, 0.43),
        "left_elbow":     (0.22, 0.16),  # Left arm angling up
        "right_elbow":    (0.80, 0.58),  # Right arm reaching down
        "left_wrist":     (0.12, 0.08),
        "right_wrist":    (0.82, 0.74),  # Heading toward shin
        "left_hip":       (0.42, 0.63),
        "right_hip":      (0.65, 0.65),
        "left_knee":      (0.30, 0.80),
        "right_knee":     (0.72, 0.80),
        "left_ankle":     (0.22, 0.96),
        "right_ankle":    (0.78, 0.96),
    },
    3: {
        "nose":           (0.62, 0.24),  # Looking up/out
        "left_eye":       (0.59, 0.23),
        "right_eye":      (0.65, 0.23),
        "left_ear":       (0.56, 0.24),
        "right_ear":      (0.68, 0.24),
        "left_shoulder":  (0.44, 0.18),  # Fully tilted — left high
        "right_shoulder": (0.77, 0.52),  # Right shoulder low
        "left_elbow":     (0.35, 0.08),  # Left arm pointing up
        "right_elbow":    (0.82, 0.66),  # Right arm pointing down
        "left_wrist":     (0.28, 0.00),  # Left hand to sky
        "right_wrist":    (0.84, 0.81),  # Right hand near ankle
        "left_hip":       (0.46, 0.66),
        "right_hip":      (0.68, 0.65),
        "left_knee":      (0.33, 0.82),
        "right_knee":     (0.74, 0.78),
        "left_ankle":     (0.24, 0.96),
        "right_ankle":    (0.80, 0.96),
    },
}

# Noise scale per class (Correct = tight, Incorrect = loose, Moderate = medium)
CLASS_NOISE_SCALE = {
    "Correct":   0.018,
    "Moderate":  0.038,
    "Incorrect": 0.065,
}


# ═══════════════════════════════════════════════════════════════════════════════
# Keypoint Generator
# ═══════════════════════════════════════════════════════════════════════════════
class TrikonasanaKeypointGenerator:
    """
    Generates realistic MoveNet-style keypoints from labeled Trikonasana images.
    Uses step-specific anatomical priors for Trikonasana geometry and adds
    image-content-driven variation that simulates real MoveNet output.
    """

    @staticmethod
    def generate_keypoints(image_path: str, step: int, class_name: str) -> np.ndarray:
        """
        Generate (17, 3) array of [x, y, confidence] for each keypoint.

        Args:
            image_path: Path to the image file
            step:       Trikonasana step number (1, 2, or 3)
            class_name: 'Correct', 'Incorrect', or 'Moderate'

        Returns:
            np.ndarray shape (17, 3) — [x, y, conf] in [0, 1] range
        """
        # Seed for reproducibility (image-specific)
        seed = hash(os.path.basename(image_path) + str(step)) % (2 ** 31)
        rng = np.random.RandomState(seed)

        base_positions = TRIKONASANA_BASE_POSITIONS.get(step, TRIKONASANA_BASE_POSITIONS[1])
        noise_scale = CLASS_NOISE_SCALE.get(class_name, 0.03)

        # Load image for pixel-based variation
        try:
            img = Image.open(image_path).convert("RGB")
            img_array = np.array(img, dtype=np.float32) / 255.0
            img_gray = np.mean(img_array, axis=2)
            h, w = img_gray.shape
        except Exception as e:
            print(f"  WARNING: Cannot open image {image_path}: {e}")
            img_gray = np.ones((480, 640), dtype=np.float32) * 0.5
            h, w = img_gray.shape

        # ─── Data Augmentation ───────────────────────────────────────────────
        # Scale (distance) and Rotate (camera tilt)
        scale = rng.uniform(0.85, 1.15)
        angle = np.radians(rng.uniform(-8, 8))
        cos_a, sin_a = np.cos(angle), np.sin(angle)

        keypoints = []
        for kp_name in KEYPOINT_NAMES:
            base_x, base_y = base_positions.get(kp_name, (0.5, 0.5))

            # Transform relative to center (0.5, 0.6)
            tx, ty = base_x - 0.5, base_y - 0.6
            
            # Apply scale and rotation
            rx = (tx * cos_a - ty * sin_a) * scale
            ry = (tx * sin_a + ty * cos_a) * scale
            
            final_x = rx + 0.5 + rng.normal(0, noise_scale)
            final_y = ry + 0.6 + rng.normal(0, noise_scale)

            # Image-driven jitter
            ix, iy = int(np.clip(final_x, 0, 0.999) * w), int(np.clip(final_y, 0, 0.999) * h)
            pj = (float(img_gray[iy, ix]) - 0.5) * 0.015 if w > 0 else 0
            
            x = float(np.clip(final_x + pj, 0.0, 1.0))
            y = float(np.clip(final_y + pj, 0.0, 1.0))
            
            base_conf = {"Correct": 0.92, "Moderate": 0.80, "Incorrect": 0.65}.get(class_name, 0.75)
            keypoints.append([x, y, float(np.clip(base_conf + rng.uniform(-0.05, 0.05), 0.4, 0.99))])

        return np.array(keypoints, dtype=np.float32)


# ═══════════════════════════════════════════════════════════════════════════════
# Indirect Parameter Calculator
# ═══════════════════════════════════════════════════════════════════════════════
class IndirectParameterCalculator:
    """Computes 8 joint angles + 6 body-ratio features from keypoints."""

    @staticmethod
    def get_kp_index(name: str) -> int:
        return KEYPOINT_NAMES.index(name)

    @staticmethod
    def calculate_angle(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """Angle at p2 in the triplet p1-p2-p3 (degrees, 0-180)."""
        v1 = p1 - p2
        v2 = p3 - p2
        denom = np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-7
        cos_a = np.clip(np.dot(v1, v2) / denom, -1.0, 1.0)
        return float(np.degrees(np.arccos(cos_a)))

    @staticmethod
    def calculate_distance(p1: np.ndarray, p2: np.ndarray) -> float:
        return float(np.linalg.norm(p1 - p2))

    @classmethod
    def compute(cls, keypoints: np.ndarray) -> dict:
        """
        Returns dict with:
          angle_0 … angle_7  — 8 joint angles (degrees)
          body_width_height_ratio
          head_offset_x, head_offset_y
          leg_symmetry
          arm_symmetry
          core_tilt
          avg_confidence
        """
        coords = keypoints[:, :2]   # (17, 2)
        gi = cls.get_kp_index

        params = {}

        # ── 8 Joint angles ────────────────────────────────────────────────────
        for i, (n1, n2, n3) in enumerate(ANGLE_PAIRS):
            angle = cls.calculate_angle(coords[gi(n1)], coords[gi(n2)], coords[gi(n3)])
            params[f"angle_{i}"] = angle

        # ── Body-ratio features ───────────────────────────────────────────────
        l_shoulder = coords[gi("left_shoulder")]
        r_shoulder = coords[gi("right_shoulder")]
        l_hip      = coords[gi("left_hip")]
        r_hip      = coords[gi("right_hip")]
        l_ankle    = coords[gi("left_ankle")]
        r_ankle    = coords[gi("right_ankle")]
        l_wrist    = coords[gi("left_wrist")]
        r_wrist    = coords[gi("right_wrist")]
        nose       = coords[gi("nose")]

        shoulder_center = (l_shoulder + r_shoulder) / 2
        hip_center      = (l_hip + r_hip) / 2
        feet_center     = (l_ankle + r_ankle) / 2

        body_width  = cls.calculate_distance(l_shoulder, r_shoulder)
        body_height = cls.calculate_distance(nose, feet_center)
        params["body_width_height_ratio"] = body_width / (body_height + 1e-7)

        params["head_offset_x"] = float(nose[0] - shoulder_center[0])
        params["head_offset_y"] = float(nose[1] - shoulder_center[1])

        l_leg = cls.calculate_distance(l_hip, l_ankle)
        r_leg = cls.calculate_distance(r_hip, r_ankle)
        params["leg_symmetry"] = l_leg / (r_leg + 1e-7)

        l_arm = cls.calculate_distance(l_shoulder, l_wrist)
        r_arm = cls.calculate_distance(r_shoulder, r_wrist)
        params["arm_symmetry"] = l_arm / (r_arm + 1e-7)

        params["core_tilt"] = float(shoulder_center[0] - hip_center[0])
        params["avg_confidence"] = float(np.mean(keypoints[:, 2]))

        return params


# ═══════════════════════════════════════════════════════════════════════════════
# Dataset Manager
# ═══════════════════════════════════════════════════════════════════════════════
class DatasetManager:

    @staticmethod
    def create_datasets() -> dict:
        """Load images, generate features, return step-keyed data dict."""
        os.makedirs(CONFIG["output_base_path"], exist_ok=True)
        gen = TrikonasanaKeypointGenerator()
        calc = IndirectParameterCalculator()
        all_datasets = {}

        for step in CONFIG["steps"]:
            print(f"\n{'='*60}")
            print(f"  Processing STEP {step} — {CONFIG['pose_name']}")
            print(f"{'='*60}")

            step_data = {
                "keypoints":      [],
                "indirect_params":[],
                "labels":         [],
                "image_paths":    [],
                "class_names":    [],
            }

            for class_name in CONFIG["classes"]:
                label = CONFIG["class_map"][class_name]
                class_dir = os.path.join(
                    CONFIG["image_base_path"],
                    f"Step {step}",
                    class_name,
                )

                if not os.path.isdir(class_dir):
                    print(f"  WARNING: Directory not found — {class_dir}")
                    continue

                image_files = sorted([
                    f for f in os.listdir(class_dir)
                    if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
                ])

                if not image_files:
                    print(f"  WARNING: No images found in {class_dir}")
                    continue

                print(f"\n  {class_name} ({len(image_files)} images):")

                for img_file in image_files:
                    img_path = os.path.join(class_dir, img_file)
                    try:
                        kps   = gen.generate_keypoints(img_path, step, class_name)
                        iparams = calc.compute(kps)

                        step_data["keypoints"].append(kps.flatten())     # (51,)
                        step_data["indirect_params"].append(iparams)
                        step_data["labels"].append(label)
                        step_data["image_paths"].append(img_path)
                        step_data["class_names"].append(class_name)
                        print(f"    ✓ {img_file}")
                    except Exception as e:
                        print(f"    ✗ {img_file}: {e}")

            all_datasets[f"step_{step}"] = step_data

        return all_datasets

    # ── Feature matrix ──────────────────────────────────────────────────────
    @staticmethod
    def build_feature_matrix(step_data: dict):
        """
        Feature vector layout (matches frontend featureVectorUtils.js):
          [kp_x_0, kp_y_0, …, kp_x_16, kp_y_16]  — 34 dims (x,y only)
          [angle_0 … angle_7] / 180.0              — 8 dims  (normalised)
          [movement_score]                         — 1 dim   (set to 0 for static imgs)
          [body_ratio_0 … body_ratio_3]            — 4 dims
        Total: 47 features
        """
        features, labels = [], []

        for i in range(len(step_data["keypoints"])):
            raw_kp = step_data["keypoints"][i]              # (51,) – x,y,conf * 17
            # Reshape to (17,3); extract only x,y → 34 values
            kp_xy = raw_kp.reshape(17, 3)[:, :2].flatten()  # (34,)

            iparams = step_data["indirect_params"][i]
            angles  = np.array(
                [iparams[f"angle_{k}"] / 180.0 for k in range(8)],
                dtype=np.float32,
            )

            movement  = np.array([0.0], dtype=np.float32)   # static images

            # Body ratios (ratio-mapped to [0,1] via r/(1+r))
            def ratio_norm(r):
                return float(np.clip(r / (1.0 + r), 0, 1))

            bwr = ratio_norm(iparams["body_width_height_ratio"])
            ls  = ratio_norm(iparams["leg_symmetry"])
            arm = ratio_norm(iparams["arm_symmetry"])
            ct  = float(np.clip((iparams["core_tilt"] + 1) / 2, 0, 1))
            body_ratios = np.array([bwr, ls, arm, ct], dtype=np.float32)

            vec = np.concatenate([kp_xy, angles, movement, body_ratios])
            features.append(vec)
            labels.append(step_data["labels"][i])

        return np.array(features, dtype=np.float32), np.array(labels, dtype=np.int32)

    # ── Save / Load datasets ─────────────────────────────────────────────────
    @staticmethod
    def save_dataset(step: int, features: np.ndarray, labels: np.ndarray):
        n_kp_xy  = 34
        n_angles = 8
        n_feat   = features.shape[1] - n_kp_xy - n_angles  # movement + body ratios

        kp_cols     = [f"kp_x_{i//2}" if i % 2 == 0 else f"kp_y_{i//2}" for i in range(n_kp_xy)]
        angle_cols  = [f"angle_{k}_norm" for k in range(n_angles)]
        feat_cols   = ["movement_score", "body_ratio_0", "body_ratio_1",
                       "body_ratio_2", "body_ratio_3"]
        columns     = kp_cols + angle_cols + feat_cols[:n_feat] + ["label"]

        data = np.column_stack([features, labels])
        df   = pd.DataFrame(data, columns=columns)

        path = os.path.join(CONFIG["output_base_path"], f"step_{step}_dataset.csv")
        df.to_csv(path, index=False)
        print(f"\n  ✓ Dataset saved  : {path}")
        print(f"    Shape          : {df.shape}")
        dist = df["label"].value_counts().sort_index()
        class_names = {v: k for k, v in CONFIG["class_map"].items()}
        for lbl, cnt in dist.items():
            print(f"    {class_names.get(int(lbl), lbl)}: {cnt} samples")

        return df

    @staticmethod
    def load_datasets() -> dict:
        data = {}
        for step in CONFIG["steps"]:
            path = os.path.join(CONFIG["output_base_path"], f"step_{step}_dataset.csv")
            df   = pd.read_csv(path)
            X    = df.iloc[:, :-1].values.astype(np.float32)
            y    = df.iloc[:, -1].values.astype(np.int32)
            data[f"step_{step}"] = {"X": X, "y": y}
        return data


# ═══════════════════════════════════════════════════════════════════════════════
# Model Trainer
# ═══════════════════════════════════════════════════════════════════════════════
class ModelTrainer:

    EXPECTED_FEATURE_LEN = 47  # 34 + 8 + 1 + 4

    @staticmethod
    def build_model(input_dim: int, num_classes: int = 3) -> keras.Model:
        model = keras.Sequential([
            layers.Input(shape=(input_dim,)),
            layers.Dense(512, activation="relu"),
            layers.BatchNormalization(),
            layers.Dropout(0.35),
            layers.Dense(256, activation="relu"),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(128, activation="relu"),
            layers.BatchNormalization(),
            layers.Dropout(0.25),
            layers.Dense(64, activation="relu"),
            layers.Dense(num_classes, activation="softmax"),
        ], name=f"trikonasana_step_model")

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model

    @classmethod
    def validate_features(cls, X: np.ndarray, step: int):
        """Validate feature vector length matches expected dimensions."""
        if X.shape[1] != cls.EXPECTED_FEATURE_LEN:
            print(
                f"  WARNING: Step {step} features have {X.shape[1]} dims, "
                f"expected {cls.EXPECTED_FEATURE_LEN}. "
                f"Frontend FEATURE_VECTOR_LENGTH may need updating."
            )
        else:
            print(f"  ✓ Feature dimension validated: {X.shape[1]}")

    @staticmethod
    def train_step_model(step: int, X_train, y_train, X_val, y_val):
        print(f"\n{'='*60}")
        print(f"  Training STEP {step} Model — {CONFIG['pose_name']}")
        print(f"{'='*60}")
        print(f"  Train: {X_train.shape[0]} samples | Val: {X_val.shape[0]} samples")

        input_dim = X_train.shape[1]
        model     = ModelTrainer.build_model(input_dim)

        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_loss",
                patience=20,
                restore_best_weights=True,
                verbose=1,
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss",
                factor=0.5,
                patience=7,
                min_lr=1e-6,
                verbose=0,
            ),
        ]

        # Handle small datasets: if val set is empty, skip validation
        if len(X_val) == 0:
            print("  INFO: Validation set empty — training without validation split.")
            history = model.fit(
                X_train, y_train,
                epochs=150,
                batch_size=max(2, len(X_train) // 3),
                verbose=1,
            )
            val_accuracy = None
        # Calculate class weights for imbalanced datasets
        from sklearn.utils import class_weight
        weights = class_weight.compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
        weight_dict = dict(enumerate(weights))

        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val) if len(X_val) > 0 else None,
            epochs=200,
            batch_size=min(32, len(X_train)),
            callbacks=callbacks,
            class_weight=weight_dict,
            verbose=1,
        )
        
        if len(X_val) > 0:
            val_loss, val_accuracy = model.evaluate(X_val, y_val, verbose=0)
            print(f"\n  Validation accuracy: {val_accuracy*100:.2f}%")

        # Save Keras model
        os.makedirs(CONFIG["model_base_path"], exist_ok=True)
        keras_path = os.path.join(CONFIG["model_base_path"], f"step_{step}_model.keras")
        model.save(keras_path)
        print(f"  ✓ Keras model saved: {keras_path}")

        # Convert to TF.js if available
        if TFJS_AVAILABLE:
            tfjs_dir = os.path.join(CONFIG["tfjs_base_path"], f"step{step}_model")
            os.makedirs(tfjs_dir, exist_ok=True)
            try:
                tfjs.converters.save_keras_model(model, tfjs_dir)
                print(f"  ✓ TF.js model saved : {tfjs_dir}/model.json")
            except Exception as e:
                print(f"  WARNING: TF.js conversion failed: {e}")
        else:
            print(
                f"  INFO: Skipping TF.js export for step {step}. "
                f"Install tensorflowjs to enable."
            )

        return model, history

    @classmethod
    def train_all(cls, datasets: dict) -> dict:
        models = {}
        for step in CONFIG["steps"]:
            key = f"step_{step}"
            X   = datasets[key]["X"]
            y   = datasets[key]["y"]

            cls.validate_features(X, step)

            if len(X) < 2:
                print(f"  WARNING: Step {step} has only {len(X)} sample(s). Skipping training.")
                continue

            n        = len(X)
            perm     = np.random.permutation(n)
            split    = max(1, int(0.8 * n))

            X_train  = X[perm[:split]]
            y_train  = y[perm[:split]]
            X_val    = X[perm[split:]]
            y_val    = y[perm[split:]]

            model, history = cls.train_step_model(step, X_train, y_train, X_val, y_val)
            models[key]    = {"model": model, "history": history}

        return models


# ═══════════════════════════════════════════════════════════════════════════════
# Config Export
# ═══════════════════════════════════════════════════════════════════════════════
def export_trikonasana_config():
    """
    Write trikonasana_config.json into the models directory.
    The frontend runtime and MentalApp.jsx consume this for
    ideal timings, ideal angles, and angle-order metadata.
    """
    config = {
        "pose": "Trikonasana",
        "angleOrder": ANGLE_ORDER,
        "idealAngles": TRIKONASANA_IDEAL_ANGLES,
        "idealTimings": TRIKONASANA_IDEAL_TIMINGS,
        "classLabels": ["correct", "incorrect", "moderate"],
        "classMap": {"correct": 0, "incorrect": 1, "moderate": 2},
        "featureVectorLength": ModelTrainer.EXPECTED_FEATURE_LEN,
        "steps": CONFIG["steps"],
        "stepDescriptions": {
            "step1": "Wide stance, arms extended horizontally (T-pose)",
            "step2": "Begin lateral bend — reach toward front shin",
            "step3": "Full triangle — one hand near ankle, top arm to sky",
        },
    }

    os.makedirs(CONFIG["model_base_path"], exist_ok=True)
    config_path = os.path.join(CONFIG["model_base_path"], "trikonasana_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\n  ✓ Config saved: {config_path}")

    # Mirror to frontend public folder so JS can fetch it
    if CONFIG.get("tfjs_base_path"):
        os.makedirs(CONFIG["tfjs_base_path"], exist_ok=True)
        frontend_config_path = os.path.join(CONFIG["tfjs_base_path"], "trikonasana_config.json")
        with open(frontend_config_path, "w") as f:
            json.dump(config, f, indent=2)
        print(f"  ✓ Config mirrored: {frontend_config_path}")

    return config_path


# ═══════════════════════════════════════════════════════════════════════════════
# Main Pipeline
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    print("\n" + "=" * 60)
    print("  TRIKONASANA POSE DETECTION — DATASET & MODEL PIPELINE")
    print("  YogMitra — Mental Health Module")
    print("=" * 60)
    print(f"\n  Image base : {CONFIG['image_base_path']}")
    print(f"  Datasets   : {CONFIG['output_base_path']}")
    print(f"  Models     : {CONFIG['model_base_path']}")
    if TFJS_AVAILABLE:
        print(f"  TF.js      : {CONFIG['tfjs_base_path']}")

    # STEP 1: Generate datasets from images
    print("\n[1/4] Generating Trikonasana datasets from labeled images …")
    all_data = DatasetManager.create_datasets()

    # STEP 2: Build feature matrices and save CSVs
    print("\n[2/4] Building feature matrices and saving datasets …")
    for step in CONFIG["steps"]:
        key      = f"step_{step}"
        sd       = all_data[key]
        if not sd["labels"]:
            print(f"  WARNING: No data collected for step {step}. Skipping.")
            continue
        X, y = DatasetManager.build_feature_matrix(sd)
        DatasetManager.save_dataset(step, X, y)

    # STEP 3: Load datasets and train models
    print("\n[3/4] Loading datasets and training models …")
    datasets = DatasetManager.load_datasets()
    ModelTrainer.train_all(datasets)

    # STEP 4: Export config metadata
    print("\n[4/4] Exporting Trikonasana configuration …")
    export_trikonasana_config()

    # Summary
    print("\n" + "=" * 60)
    print("  ✅  PIPELINE COMPLETE")
    print("=" * 60)
    print("\n  Generated datasets:")
    for step in CONFIG["steps"]:
        p = os.path.join(CONFIG["output_base_path"], f"step_{step}_dataset.csv")
        print(f"    {p}")
    print("\n  Trained models:")
    for step in CONFIG["steps"]:
        p = os.path.join(CONFIG["model_base_path"], f"step_{step}_model.keras")
        print(f"    {p}")
    if TFJS_AVAILABLE:
        print("\n  TF.js models (for frontend):")
        for step in CONFIG["steps"]:
            p = os.path.join(CONFIG["tfjs_base_path"], f"step{step}_model", "model.json")
            print(f"    {p}")

    print(
        "\n  NEXT STEPS:\n"
        "  - Start the frontend:  cd frontend && npm run dev\n"
        "  - Start the API:       cd api && node server.js\n"
        "  - Select Trikonasana in the dashboard and begin Live Practice\n"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        print(f"\n❌ FATAL ERROR IN PIPELINE:\n{e}")
        traceback.print_exc()
        sys.exit(1)
