"""
Dataset Generation Pipeline for Yoga Pose Detection
Generates mock MoveNet keypoints and indirect parameters from images
Trains separate models for each step
"""

import os
import numpy as np
import pandas as pd
from PIL import Image
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import json
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Configuration
CONFIG = {
    'image_base_path': r'c:\Users\molly\OneDrive\Desktop\Yoga-Pose Detection\Images',
    'output_base_path': r'c:\Users\molly\OneDrive\Desktop\Yoga-Pose Detection\datasets',
    'model_base_path': r'c:\Users\molly\OneDrive\Desktop\Yoga-Pose Detection\models',
    'steps': [1, 2, 3],
    'classes': ['Correct', 'Incorrect', 'Moderate'],
    'class_map': {'Correct': 0, 'Incorrect': 1, 'Moderate': 2},
    'num_keypoints': 17,  # MoveNet output: 17 keypoints
    'keypoint_dims': 3,   # x, y, confidence for each keypoint
}

# MoveNet keypoint indices
KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
]

# Keypoint pair indices for angle calculations (8 fixed angles)
ANGLE_PAIRS = [
    ('left_shoulder', 'left_elbow', 'left_wrist'),    # Left arm angle
    ('right_shoulder', 'right_elbow', 'right_wrist'),  # Right arm angle
    ('left_hip', 'left_knee', 'left_ankle'),           # Left leg angle
    ('right_hip', 'right_knee', 'right_ankle'),        # Right leg angle
    ('left_shoulder', 'left_hip', 'left_knee'),        # Left torso-leg angle
    ('right_shoulder', 'right_hip', 'right_knee'),     # Right torso-leg angle
    ('left_eye', 'nose', 'right_eye'),                 # Head tilt
    ('left_shoulder', 'right_shoulder', 'nose'),       # Shoulder alignment
]

class KeypointGenerator:
    """Generates mock MoveNet keypoints from images with realistic variation"""
    
    @staticmethod
    def generate_keypoints(image_path):
        """
        Generate mock MoveNet keypoints from image
        Returns: (17, 3) array of [x, y, confidence] for each keypoint
        """
        try:
            img = Image.open(image_path)
            img_array = np.array(img, dtype=np.float32)
            
            if len(img_array.shape) == 3:
                # Convert to grayscale for feature extraction
                if img_array.shape[2] == 4:  # RGBA
                    img_gray = np.mean(img_array[:, :, :3], axis=2)
                else:  # RGB
                    img_gray = np.mean(img_array, axis=2)
            else:
                img_gray = img_array
            
            # Normalize
            img_gray = img_gray / 255.0
            h, w = img_gray.shape
            
            # Generate keypoints using image features and priors
            keypoints = []
            np.random.seed(hash(image_path) % 2**32)  # Reproducible randomness
            
            for kp_idx, kp_name in enumerate(KEYPOINT_NAMES):
                # Base position (anatomically reasonable for standing pose)
                base_positions = {
                    'nose': (0.5, 0.3),
                    'left_eye': (0.45, 0.28),
                    'right_eye': (0.55, 0.28),
                    'left_ear': (0.40, 0.27),
                    'right_ear': (0.60, 0.27),
                    'left_shoulder': (0.35, 0.45),
                    'right_shoulder': (0.65, 0.45),
                    'left_elbow': (0.30, 0.55),
                    'right_elbow': (0.70, 0.55),
                    'left_wrist': (0.28, 0.65),
                    'right_wrist': (0.72, 0.65),
                    'left_hip': (0.38, 0.70),
                    'right_hip': (0.62, 0.70),
                    'left_knee': (0.38, 0.85),
                    'right_knee': (0.62, 0.85),
                    'left_ankle': (0.38, 1.0),
                    'right_ankle': (0.62, 1.0),
                }
                
                base_x, base_y = base_positions.get(kp_name, (0.5, 0.5))
                
                # Add variation based on image content
                noise_x = np.random.normal(0, 0.02)
                noise_y = np.random.normal(0, 0.02)
                
                # Precompute edge variations to avoid NaN
                try:
                    if iy >= h:
                        ey = 0.5
                    else:
                        ey = np.mean(img_gray[iy::, :]) if iy < h else 0.5
                    edge_variation_y = (ey - 0.5) * 0.03
                    
                    if ix >= w:
                        ex = 0.5
                    else:
                        ex = np.mean(img_gray[:, ix::]) if ix < w else 0.5
                    edge_variation_x = (ex - 0.5) * 0.03
                except:
                    edge_variation_x = 0
                    edge_variation_y = 0
                
                x = base_x + noise_x + edge_variation_x
                y = base_y + noise_y + edge_variation_y
                
                # Clip to valid range
                x = np.clip(x, 0, 1)
                y = np.clip(y, 0, 1)
                
                # Confidence based on image intensity at keypoint location
                try:
                    iy, ix = int(y * h), int(x * w)
                    iy = min(max(iy, 0), h-1)
                    ix = min(max(ix, 0), w-1)
                    confidence = float(img_gray[iy, ix])
                    confidence = np.clip(confidence, 0, 1)
                    confidence = max(0.5, confidence)  # Minimum confidence threshold
                except:
                    confidence = 0.75  # Default confidence if error
                
                keypoints.append([x, y, confidence])
            
            return np.array(keypoints, dtype=np.float32)
        
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            # Return default standing posture if error
            return KeypointGenerator._default_keypoints()
    
    @staticmethod
    def _default_keypoints():
        """Default standing posture keypoints"""
        positions = [
            (0.5, 0.3),   # nose
            (0.45, 0.28), # left_eye
            (0.55, 0.28), # right_eye
            (0.40, 0.27), # left_ear
            (0.60, 0.27), # right_ear
            (0.35, 0.45), # left_shoulder
            (0.65, 0.45), # right_shoulder
            (0.30, 0.55), # left_elbow
            (0.70, 0.55), # right_elbow
            (0.28, 0.65), # left_wrist
            (0.72, 0.65), # right_wrist
            (0.38, 0.70), # left_hip
            (0.62, 0.70), # right_hip
            (0.38, 0.85), # left_knee
            (0.62, 0.85), # right_knee
            (0.38, 1.0),  # left_ankle
            (0.62, 1.0),  # right_ankle
        ]
        keypoints = [[x, y, 0.8] for x, y in positions]
        return np.array(keypoints, dtype=np.float32)


class IndirectParameterCalculator:
    """Calculates indirect parameters (angles, distances, normalizations)"""
    
    @staticmethod
    def get_keypoint_index(name):
        """Get index of keypoint by name"""
        return KEYPOINT_NAMES.index(name)
    
    @staticmethod
    def calculate_angle(p1, p2, p3):
        """
        Calculate angle at p2 between p1-p2-p3
        Returns: angle in degrees (0-180)
        """
        v1 = p1 - p2
        v2 = p3 - p2
        
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        cos_angle = np.clip(cos_angle, -1, 1)
        angle = np.arccos(cos_angle) * 180 / np.pi
        
        return angle
    
    @staticmethod
    def calculate_distance(p1, p2):
        """Calculate Euclidean distance between two points"""
        return np.linalg.norm(p1 - p2)
    
    @staticmethod
    def calculate_indirect_parameters(keypoints):
        """
        Calculate 8 fixed angles and additional indirect parameters
        Returns: dictionary with all calculated parameters
        """
        params = {}
        
        # Extract x,y coordinates (ignore confidence)
        kp_coords = keypoints[:, :2]
        
        # Calculate 8 fixed angles
        angles = {}
        for i, (p1_name, p2_name, p3_name) in enumerate(ANGLE_PAIRS):
            p1_idx = IndirectParameterCalculator.get_keypoint_index(p1_name)
            p2_idx = IndirectParameterCalculator.get_keypoint_index(p2_name)
            p3_idx = IndirectParameterCalculator.get_keypoint_index(p3_name)
            
            angle = IndirectParameterCalculator.calculate_angle(
                kp_coords[p1_idx],
                kp_coords[p2_idx],
                kp_coords[p3_idx]
            )
            angles[f'angle_{i}_{p1_name}_{p2_name}_{p3_name}'] = angle
            params[f'angle_{i}'] = angle
        
        # Additional indirect parameters
        # 1. Body width to height ratio
        left_shoulder = kp_coords[IndirectParameterCalculator.get_keypoint_index('left_shoulder')]
        right_shoulder = kp_coords[IndirectParameterCalculator.get_keypoint_index('right_shoulder')]
        head = kp_coords[IndirectParameterCalculator.get_keypoint_index('nose')]
        feet = (kp_coords[IndirectParameterCalculator.get_keypoint_index('left_ankle')] +
                kp_coords[IndirectParameterCalculator.get_keypoint_index('right_ankle')]) / 2
        
        body_width = IndirectParameterCalculator.calculate_distance(left_shoulder, right_shoulder)
        body_height = IndirectParameterCalculator.calculate_distance(head, feet)
        params['body_width_height_ratio'] = body_width / (body_height + 1e-6)
        
        # 2. Head position (relative to shoulders)
        shoulder_center = (left_shoulder + right_shoulder) / 2
        head_offset_x = head[0] - shoulder_center[0]
        head_offset_y = head[1] - shoulder_center[1]
        params['head_offset_x'] = head_offset_x
        params['head_offset_y'] = head_offset_y
        
        # 3. Leg symmetry (left vs right)
        left_hip = kp_coords[IndirectParameterCalculator.get_keypoint_index('left_hip')]
        right_hip = kp_coords[IndirectParameterCalculator.get_keypoint_index('right_hip')]
        left_ankle = kp_coords[IndirectParameterCalculator.get_keypoint_index('left_ankle')]
        right_ankle = kp_coords[IndirectParameterCalculator.get_keypoint_index('right_ankle')]
        
        left_leg_length = IndirectParameterCalculator.calculate_distance(left_hip, left_ankle)
        right_leg_length = IndirectParameterCalculator.calculate_distance(right_hip, right_ankle)
        params['leg_symmetry'] = left_leg_length / (right_leg_length + 1e-6)
        
        # 4. Arm symmetry
        left_shoulder = kp_coords[IndirectParameterCalculator.get_keypoint_index('left_shoulder')]
        right_shoulder = kp_coords[IndirectParameterCalculator.get_keypoint_index('right_shoulder')]
        left_wrist = kp_coords[IndirectParameterCalculator.get_keypoint_index('left_wrist')]
        right_wrist = kp_coords[IndirectParameterCalculator.get_keypoint_index('right_wrist')]
        
        left_arm_length = IndirectParameterCalculator.calculate_distance(left_shoulder, left_wrist)
        right_arm_length = IndirectParameterCalculator.calculate_distance(right_shoulder, right_wrist)
        params['arm_symmetry'] = left_arm_length / (right_arm_length + 1e-6)
        
        # 5. Core tilt
        left_hip_x = left_hip[0]
        right_hip_x = right_hip[0]
        hip_center_x = (left_hip_x + right_hip_x) / 2
        shoulder_center_x = (left_shoulder[0] + right_shoulder[0]) / 2
        params['core_tilt'] = shoulder_center_x - hip_center_x
        
        # 6. Average keypoint confidence
        params['avg_confidence'] = np.mean(keypoints[:, 2])
        
        return params


class DatasetManager:
    """Manages dataset creation, loading, and preprocessing"""
    
    @staticmethod
    def create_datasets():
        """Create datasets for all steps"""
        os.makedirs(CONFIG['output_base_path'], exist_ok=True)
        
        all_datasets = {}
        
        for step in CONFIG['steps']:
            print(f"\n{'='*60}")
            print(f"Processing STEP {step}")
            print(f"{'='*60}")
            
            step_data = {
                'keypoints': [],
                'indirect_params': [],
                'labels': [],
                'image_paths': [],
                'class_names': []
            }
            
            for class_name in CONFIG['classes']:
                class_label = CONFIG['class_map'][class_name]
                step_path = os.path.join(
                    CONFIG['image_base_path'],
                    f'Step {step}',
                    class_name
                )
                
                image_files = sorted([f for f in os.listdir(step_path) 
                                    if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                
                print(f"\n{class_name}: Found {len(image_files)} images")
                
                for img_file in image_files:
                    img_path = os.path.join(step_path, img_file)
                    
                    # Generate keypoints
                    keypoints = KeypointGenerator.generate_keypoints(img_path)
                    
                    # Calculate indirect parameters
                    indirect_params = IndirectParameterCalculator.calculate_indirect_parameters(keypoints)
                    
                    # Store data
                    step_data['keypoints'].append(keypoints.flatten())
                    step_data['indirect_params'].append(indirect_params)
                    step_data['labels'].append(class_label)
                    step_data['image_paths'].append(img_path)
                    step_data['class_names'].append(class_name)
                    
                    print(f"  >> {img_file}")
            
            all_datasets[f'step_{step}'] = step_data
        
        return all_datasets


class DataProcessor:
    """Processes and prepares data for model training"""
    
    @staticmethod
    def create_feature_matrix(step_data):
        """
        Create feature matrix combining direct (keypoints) and indirect parameters
        Returns: (num_samples, num_features), labels
        """
        features = []
        
        for i in range(len(step_data['keypoints'])):
            # Direct parameters: flattened keypoints
            direct_features = step_data['keypoints'][i]  # Already flattened (51,)
            
            # Indirect parameters
            indirect_dict = step_data['indirect_params'][i]
            indirect_features = np.array([indirect_dict[key] for key in sorted(indirect_dict.keys())])
            
            # Combine
            combined = np.concatenate([direct_features, indirect_features])
            features.append(combined)
        
        return np.array(features), np.array(step_data['labels'])
    
    @staticmethod
    def save_dataset(step, features, labels, indirect_keys):
        """Save dataset to CSV"""
        datasets_path = CONFIG['output_base_path']
        os.makedirs(datasets_path, exist_ok=True)
        
        # Create column names
        keypoint_cols = [f'kp_{i}' for i in range(51)]  # 17 keypoints * 3 dims
        indirect_cols = [f'indirect_{key}' for key in sorted(indirect_keys)]
        columns = keypoint_cols + indirect_cols + ['label']
        
        # Create DataFrame
        data = np.column_stack([features, labels])
        df = pd.DataFrame(data, columns=columns)
        
        # Save
        filepath = os.path.join(datasets_path, f'step_{step}_dataset.csv')
        df.to_csv(filepath, index=False)
        
        print(f">> Saved dataset: {filepath}")
        print(f"  Shape: {df.shape}")
        print(f"  Class distribution:\n{df['label'].value_counts().sort_index()}")
        
        return df
    
    @staticmethod
    def load_and_merge_datasets():
        """Load and merge datasets for all steps"""
        merged_data = {}
        
        for step in CONFIG['steps']:
            filepath = os.path.join(CONFIG['output_base_path'], f'step_{step}_dataset.csv')
            df = pd.read_csv(filepath)
            
            X = df.iloc[:, :-1].values
            y = df.iloc[:, -1].values
            
            merged_data[f'step_{step}'] = {'X': X, 'y': y}
        
        return merged_data


class ModelTrainer:
    """Trains classification models for each step"""
    
    @staticmethod
    def build_model(input_dim, num_classes=3):
        """Build neural network model"""
        model = keras.Sequential([
            layers.Dense(256, activation='relu', input_dim=input_dim),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            
            layers.Dense(64, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.2),
            
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            
            layers.Dense(num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    @staticmethod
    def train_step_model(step, X_train, y_train, X_val, y_val):
        """Train model for a specific step"""
        print(f"\n{'='*60}")
        print(f"Training STEP {step} Model")
        print(f"{'='*60}")
        
        input_dim = X_train.shape[1]
        model = ModelTrainer.build_model(input_dim, num_classes=3)
        
        print(f"Model architecture:")
        model.summary()
        
        # Train
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=100,
            batch_size=8,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=15,
                    restore_best_weights=True,
                    verbose=1
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    min_lr=1e-6,
                    verbose=1
                )
            ],
            verbose=1
        )
        
        # Evaluate
        val_loss, val_accuracy = model.evaluate(X_val, y_val, verbose=0)
        print(f"\nValidation Accuracy: {val_accuracy*100:.2f}%")
        
        # Save model
        os.makedirs(CONFIG['model_base_path'], exist_ok=True)
        model_path = os.path.join(CONFIG['model_base_path'], f'step_{step}_model.keras')
        model.save(model_path)
        print(f">> Model saved: {model_path}")
        
        return model, history
    
    @staticmethod
    def train_all_models(merged_data):
        """Train models for all steps"""
        models = {}
        
        for step in CONFIG['steps']:
            dataset_key = f'step_{step}'
            X = merged_data[dataset_key]['X']
            y = merged_data[dataset_key]['y']
            
            # Split data (80-20)
            num_samples = len(X)
            split_idx = int(0.8 * num_samples)
            
            indices = np.random.permutation(num_samples)
            
            X_train = X[indices[:split_idx]]
            y_train = y[indices[:split_idx]]
            X_val = X[indices[split_idx:]]
            y_val = y[indices[split_idx:]]
            
            print(f"\nStep {step} data split:")
            print(f"  Training: {X_train.shape[0]} samples")
            print(f"  Validation: {X_val.shape[0]} samples")
            
            model, history = ModelTrainer.train_step_model(step, X_train, y_train, X_val, y_val)
            models[f'step_{step}'] = {'model': model, 'history': history}
        
        return models


def main():
    """Main pipeline execution"""
    print("\n" + "="*60)
    print("YOGA POSE DETECTION - DATASET GENERATION & MODEL TRAINING")
    print("="*60)
    
    # Step 1: Generate datasets
    print("\n[STEP 1] Generating mock datasets...")
    all_datasets = DatasetManager.create_datasets()
    
    # Step 2: Process data and save datasets
    print("\n[STEP 2] Processing data and saving datasets...")
    for step in CONFIG['steps']:
        step_data = all_datasets[f'step_{step}']
        features, labels = DataProcessor.create_feature_matrix(step_data)
        
        # Get indirect parameter keys
        indirect_keys = list(step_data['indirect_params'][0].keys())
        
        DataProcessor.save_dataset(step, features, labels, indirect_keys)
    
    # Step 3: Load and merge datasets
    print("\n[STEP 3] Loading datasets...")
    merged_data = DataProcessor.load_and_merge_datasets()
    
    # Step 4: Train models
    print("\n[STEP 4] Training models...")
    models = ModelTrainer.train_all_models(merged_data)
    
    print("\n" + "="*60)
    print(">> PIPELINE COMPLETE!")
    print("="*60)
    print("\nGenerated datasets:")
    for step in CONFIG['steps']:
        print(f"  - {CONFIG['output_base_path']}/step_{step}_dataset.csv")
    print("\nTrained models:")
    for step in CONFIG['steps']:
        print(f"  - {CONFIG['model_base_path']}/step_{step}_model/")


if __name__ == '__main__':
    main()
