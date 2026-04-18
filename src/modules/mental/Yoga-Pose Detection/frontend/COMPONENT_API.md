# Component API Reference

## PoseDetectorComponent

Production-ready React component for real-time pose detection using MoveNet Lightning.

### Props

#### `onKeypointsUpdate` (Function) - Optional

Callback function invoked whenever keypoints are detected from a video frame.

**Signature:**

```typescript
onKeypointsUpdate?: (keypoints: Keypoint[]) => void

interface Keypoint {
  x: number        // Normalized X coordinate (0-1)
  y: number        // Normalized Y coordinate (0-1)
  score: number    // Confidence score (0-1)
  visible?: boolean // Whether above confidence threshold
}
```

**Example:**

```jsx
<PoseDetectorComponent
  onKeypointsUpdate={(keypoints) => {
    console.log(`Detected ${keypoints.length} keypoints`);
    keypoints.forEach((kp, i) => {
      console.log(`Keypoint ${i}: (${kp.x}, ${kp.y}) confidence: ${kp.score}`);
    });
  }}
/>
```

---

#### `options` (Object) - Optional

Configuration object to customize component behavior.

**Signature:**

```typescript
options?: ComponentOptions

interface ComponentOptions {
  modelType?: 'lite' | 'full'  // Default: 'lite'
  frameSkip?: number            // Default: 1 (every frame)
  minConfidence?: number        // Default: 0.5 (0-1 range)
  targetFPS?: number            // Default: 30
  showDebugInfo?: boolean       // Default: false
}
```

**Properties:**

##### `modelType`

- **Type**: `'lite' | 'full'`
- **Default**: `'lite'`
- **Description**: MoveNet model variant
  - `'lite'`: Faster (~40MB), lower latency
  - `'full'`: More accurate (~100MB), higher latency

**Example:**

```jsx
<PoseDetectorComponent options={{ modelType: "lite" }} />
```

---

##### `frameSkip`

- **Type**: `number`
- **Default**: `1`
- **Range**: `1` to `30`
- **Description**: Process every Nth frame
  - `1`: Process every frame (highest quality)
  - `2`: Process every 2nd frame (50% faster)
  - `3`: Process every 3rd frame (66% faster)

**Use Cases:**

```jsx
// Real-time feedback (more responsive)
<PoseDetectorComponent options={{ frameSkip: 1 }} />

// Mobile optimization (better performance)
<PoseDetectorComponent options={{ frameSkip: 2 }} />

// Battery saving (lowest resource usage)
<PoseDetectorComponent options={{ frameSkip: 3 }} />
```

---

##### `minConfidence`

- **Type**: `number`
- **Default**: `0.5`
- **Range**: `0` to `1`
- **Description**: Confidence threshold for keypoint filtering
  - Keypoints below this score are marked as `visible: false`
  - Higher values = only very confident detections

**Example:**

```jsx
// Strict filtering (only high-confidence keypoints)
<PoseDetectorComponent options={{ minConfidence: 0.8 }} />

// Loose filtering (include medium-confidence keypoints)
<PoseDetectorComponent options={{ minConfidence: 0.3 }} />
```

---

##### `targetFPS`

- **Type**: `number`
- **Default**: `30`
- **Range**: `15` to `60`
- **Description**: Target frames per second for detection loop
  - Actual FPS may vary based on device performance
  - Controls animation loop frequency

**Example:**

```jsx
// High-performance (60 FPS)
<PoseDetectorComponent options={{ targetFPS: 60 }} />

// Standard (30 FPS)
<PoseDetectorComponent options={{ targetFPS: 30 }} />

// Low-power mode (15 FPS)
<PoseDetectorComponent options={{ targetFPS: 15 }} />
```

---

##### `showDebugInfo`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Display debug keypoints panel
  - Shows all detected keypoints with coordinates
  - Shows confidence scores for each keypoint
  - Useful for development and troubleshooting

**Example:**

```jsx
// Enable debug panel
<PoseDetectorComponent options={{ showDebugInfo: true }} />
```

---

### Complete Example

```jsx
import PoseDetectorComponent from "./components/PoseDetectorComponent";

function YogaPoseApp() {
  const [poseData, setPoseData] = useState([]);

  function handleKeypointsUpdate(keypoints) {
    // Filter for high-confidence keypoints only
    const highConfidence = keypoints.filter((kp) => kp.score > 0.7);

    setPoseData((prevData) => [
      ...prevData,
      {
        timestamp: Date.now(),
        keypoints: highConfidence,
      },
    ]);
  }

  return (
    <PoseDetectorComponent
      onKeypointsUpdate={handleKeypointsUpdate}
      options={{
        modelType: "lite",
        frameSkip: 1,
        minConfidence: 0.5,
        targetFPS: 30,
        showDebugInfo: true,
      }}
    />
  );
}
```

---

## usePoseDetection Hook

Custom React hook for managing pose detection lifecycle.

### Signature

```typescript
usePoseDetection(
  videoElement: HTMLVideoElement | null,
  onKeypointsDetected: (keypoints: Keypoint[]) => void,
  options?: HookOptions
): PoseDetectionHook

interface HookOptions {
  modelType?: 'lite' | 'full'
  frameSkip?: number
  minConfidence?: number
  targetFPS?: number
}

interface PoseDetectionHook {
  isModelLoaded: boolean
  isDetecting: boolean
  error: string | null
  fps: number
  startDetection: () => Promise<void>
  stopDetection: () => void
  initializeModel: () => Promise<void>
}
```

### Usage

```jsx
import { usePoseDetection } from "../hooks/usePoseDetection";

function CustomPoseComponent() {
  const videoRef = useRef(null);
  const [keypoints, setKeypoints] = useState([]);

  const poseDetection = usePoseDetection(videoRef.current, setKeypoints, {
    modelType: "lite",
    minConfidence: 0.5,
  });

  return (
    <div>
      <video ref={videoRef} autoPlay muted playsInline />

      <button onClick={() => poseDetection.startDetection()}>
        Start Detection
      </button>

      <button onClick={() => poseDetection.stopDetection()}>
        Stop Detection
      </button>

      {poseDetection.isModelLoaded && <p>Model Ready</p>}
      {poseDetection.isDetecting && <p>Detecting...</p>}
      {poseDetection.error && <p>Error: {poseDetection.error}</p>}

      <p>FPS: {poseDetection.fps.toFixed(1)}</p>
      <p>Keypoints: {keypoints.length}/17</p>
    </div>
  );
}
```

### Return Values

#### `isModelLoaded`

- **Type**: `boolean`
- **Description**: Whether MoveNet model has been loaded
- **Usage**: Check before starting detection

#### `isDetecting`

- **Type**: `boolean`
- **Description**: Whether pose detection is currently running
- **Usage**: Show/hide detection UI, disable/enable buttons

#### `error`

- **Type**: `string | null`
- **Description**: Latest error message, null if no error
- **Usage**: Display error messages to user

#### `fps`

- **Type**: `number`
- **Description**: Current frames per second
- **Usage**: Monitor performance, debug performance issues

#### `startDetection()`

- **Type**: `() => Promise<void>`
- **Description**: Initialize model and start detection
- **Throws**: Error if model initialization fails
- **Usage**: Call from button click or useEffect

#### `stopDetection()`

- **Type**: `() => void`
- **Description**: Stop detection loop and pause processing
- **Usage**: Call when component unmounts or user pauses

#### `initializeModel()`

- **Type**: `() => Promise<void>`
- **Description**: Pre-load MoveNet model
- **Throws**: Error if model download/initialization fails
- **Usage**: Pre-load model before showing detection UI

---

## Canvas Utils

### `drawSkeleton(ctx, keypoints, canvasWidth, canvasHeight, minScore?)`

Draw complete skeleton visualization (keypoints + connecting lines).

**Signature:**

```typescript
drawSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  canvasWidth: number,
  canvasHeight: number,
  minScore?: number
): void
```

**Example:**

```jsx
const canvasRef = useRef(null);

function drawVisualization(keypoints) {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  clearCanvas(ctx, canvas.width, canvas.height);

  drawSkeleton(ctx, keypoints, canvas.width, canvas.height, 0.5);
  drawFPS(ctx, 30);
}
```

---

### `drawKeypoints(ctx, keypoints, canvasWidth, canvasHeight, minScore?)`

Draw only keypoints (circles), no skeleton connections.

**Example:**

```jsx
drawKeypoints(ctx, keypoints, canvas.width, canvas.height, 0.5);
```

---

### `clearCanvas(ctx, canvasWidth, canvasHeight)`

Clear entire canvas.

**Example:**

```jsx
clearCanvas(ctx, canvas.width, canvas.height);
```

---

### `drawFPS(ctx, fps)`

Draw FPS counter in top-left corner.

**Example:**

```jsx
drawFPS(ctx, currentFPS);
```

---

### `drawStatusText(ctx, text, y?)`

Draw status text on canvas.

**Example:**

```jsx
drawStatusText(ctx, "No pose detected", 60);
```

---

### Constants

#### `KEYPOINT_NAMES`

Array of 17 keypoint names in MoveNet order.

```javascript
[
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];
```

#### `SKELETON_CONNECTIONS`

Array of keypoint index pairs for drawing skeleton lines.

```javascript
[
  [0, 1],
  [0, 2], // nose to eyes
  [1, 3],
  [2, 4], // eyes to ears
  // ... more connections
];
```

#### `COLORS`

Color palette for visualization.

```javascript
{
  keypoint: '#00FF00',              // Bright green
  keypointHighConfidence: '#FF6600', // Orange
  skeleton: '#00AA00',              // Darker green
  text: '#FFFFFF',                  // White
  background: 'rgba(0, 0, 0, 0.3)' // Semi-transparent black
}
```

---

## Camera Utils

### `requestCameraAccess()`

Request webcam permission and return MediaStream.

**Signature:**

```typescript
requestCameraAccess(): Promise<MediaStream>
```

**Throws:**

```
NotAllowedError: Camera permission denied
NotFoundError: No camera device
NotReadableError: Camera already in use
```

**Example:**

```jsx
try {
  const stream = await requestCameraAccess();
  videoElement.srcObject = stream;
} catch (error) {
  console.error("Camera access failed:", error.message);
}
```

---

### `stopCameraStream(stream)`

Stop video stream and release camera.

**Example:**

```jsx
useEffect(() => {
  return () => {
    stopCameraStream(videoRef.current?.srcObject);
  };
}, []);
```

---

### `setVideoSource(videoElement, stream)`

Attach MediaStream to video element.

**Example:**

```jsx
const stream = await requestCameraAccess();
setVideoSource(videoElement, stream);
```

---

### `waitForVideoReady(videoElement)`

Wait for video metadata to load (10 second timeout).

**Example:**

```jsx
await waitForVideoReady(videoElement);
console.log("Video is ready to process");
```

---

### `getVideoDimensions(videoElement)`

Get video width and height in pixels.

**Example:**

```jsx
const { width, height } = getVideoDimensions(videoElement);
console.log(`Video dimensions: ${width}x${height}`);
```

---

## Error Handling

### Camera Errors

```javascript
try {
  const stream = await requestCameraAccess();
} catch (error) {
  if (error.name === "NotAllowedError") {
    // User denied camera access
    showPermissionDialog();
  } else if (error.name === "NotFoundError") {
    // No camera device
    showNoDeviceMessage();
  } else if (error.name === "NotReadableError") {
    // Camera in use by another app
    showCameraInUseMessage();
  }
}
```

### Model Loading Errors

```javascript
const { error } = usePoseDetection(videoRef.current, onKeypoints);

if (error) {
  console.error("Model error:", error);
  // Retry or show error dialog
}
```

---

## Performance Tips

1. **Use 'lite' model** for lower latency
2. **Increase frameSkip** on slower devices
3. **Lower targetFPS** for battery saving
4. **Use requestAnimationFrame** for smooth rendering
5. **Normalize keypoints** to reduce data size
6. **Filter low-confidence** keypoints

---

## Coordinate System

All keypoint coordinates are **normalized to 0-1 range**:

```
(0,0) ──────────────── (1,0)
  │                       │
  │                       │
  │       Canvas          │
  │                       │
  │                       │
(0,1) ──────────────── (1,1)

x = pixelX / canvasWidth
y = pixelY / canvasHeight
```

---

## Browser Compatibility

| Browser | Desktop | Mobile | Version |
| ------- | ------- | ------ | ------- |
| Chrome  | ✓       | ✓      | 90+     |
| Firefox | ✓       | ✓      | 88+     |
| Safari  | ✓       | ✓      | 14+     |
| Edge    | ✓       | -      | 90+     |

---

## Memory Management

- Automatic cleanup on component unmount
- Model disposal if supported
- Stream tracks stopped
- Reference cleanup

---

## Rate Limiting

```javascript
// Use frameSkip to reduce processing
const frameSkip = Math.floor(30 / targetFPS);
// For 30 FPS target: frameSkip = 1 (process every frame)
// For 15 FPS target: frameSkip = 2 (process every 2nd frame)
```
