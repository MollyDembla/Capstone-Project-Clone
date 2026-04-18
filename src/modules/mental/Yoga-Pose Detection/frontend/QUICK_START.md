# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

Opens at: http://localhost:5173

### Step 3: Allow Camera Permission

- Click "Allow" when browser requests camera access
- Component automatically initializes

### Step 4: Use the Component

The app will:

1. Load MoveNet model (2-3 seconds)
2. Display video feed with skeleton overlay
3. Show FPS counter and keypoint count
4. Display detected keypoints in real-time

---

## Usage in Your React App

### 1. Import Component

```jsx
import PoseDetectorComponent from "./components/PoseDetectorComponent";
```

### 2. Add to JSX

```jsx
<PoseDetectorComponent
  onKeypointsUpdate={(keypoints) => {
    console.log("Got keypoints:", keypoints);
  }}
/>
```

### 3. Handle Keypoints

```javascript
function handleKeypoints(keypoints) {
  // keypoints = [{x: 0.5, y: 0.3, score: 0.95}, ...]

  // Calculate angle between 3 points
  const angle = calculateAngle(
    keypoints[5], // left_shoulder
    keypoints[6], // right_shoulder
    keypoints[11], // left_hip
  );

  console.log("Angle:", angle);
}
```

---

## Keypoint Indices

```
 0: nose
 1: left_eye          5: left_shoulder    9: left_wrist    11: left_hip    13: left_knee     15: left_ankle
 2: right_eye         6: right_shoulder  10: right_wrist   12: right_hip   14: right_knee    16: right_ankle
 3: left_ear
 4: right_ear
 7: left_elbow        8: right_elbow
```

---

## Common Tasks

### Get Shoulder Coordinates

```javascript
const leftShoulder = keypoints[5]; // {x, y, score}
const rightShoulder = keypoints[6]; // {x, y, score}
```

### Check if Keypoint is Visible

```javascript
if (keypoints[5].score > 0.5) {
  console.log("Left shoulder detected");
}
```

### Calculate Distance Between Points

```javascript
function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const shoulderDistance = distance(keypoints[5], keypoints[6]);
```

### Calculate Angle Between Three Points

```javascript
function angle(p1, p2, p3) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  const cos = dot / (mag1 * mag2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// Example: arm angle
const armAngle = angle(keypoints[5], keypoints[7], keypoints[9]);
console.log("Arm angle:", armAngle);
```

---

## Optimization Options

### For Real-Time Feedback

```jsx
<PoseDetectorComponent
  options={{
    frameSkip: 1, // Process every frame
    targetFPS: 30,
    minConfidence: 0.5,
  }}
/>
```

### For Mobile Performance

```jsx
<PoseDetectorComponent
  options={{
    modelType: "lite", // Faster model
    frameSkip: 2, // Skip frames
    targetFPS: 15, // Lower FPS
    minConfidence: 0.6, // Higher threshold
  }}
/>
```

### For Maximum Accuracy

```jsx
<PoseDetectorComponent
  options={{
    modelType: "full", // More accurate
    frameSkip: 1, // No skipping
    targetFPS: 30,
    minConfidence: 0.3, // Lower threshold
  }}
/>
```

---

## Debug Mode

Enable debug panel to see all keypoint data:

```jsx
<PoseDetectorComponent
  options={{
    showDebugInfo: true, // Show keypoints panel
  }}
/>
```

This displays:

- All 17 keypoint coordinates
- Confidence scores
- Color-coded by confidence level

---

## Troubleshooting

### No Camera Access

- Check browser permissions
- Use HTTPS (required for camera)
- Try "Retry" button

### Model Takes Too Long to Load

- First load downloads ~40MB
- Subsequent loads use browser cache
- Consider pre-loading: `options.preloadModel: true`

### Low FPS

- Increase `frameSkip`
- Lower `targetFPS`
- Use 'lite' model
- Close other browser tabs

### Inaccurate Keypoints

- Improve lighting
- Keep full body in view
- Lower `minConfidence` threshold
- Use 'full' model type

---

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PoseDetectorComponent.jsx
│   │   └── PoseDetectorComponent.css
│   ├── hooks/
│   │   └── usePoseDetection.js
│   ├── utils/
│   │   ├── canvasUtils.js
│   │   └── cameraUtils.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

## Next Steps

1. **Integrate Backend:** Connect to scoring API
2. **Add State Machine:** Track step progression
3. **Calculate Angles:** Build angle detection
4. **Smooth Noise:** Implement EMA filter
5. **Score Poses:** Calculate accuracy
6. **Provide Feedback:** Real-time corrections

---

## Resources

- **README.md** - Complete documentation
- **COMPONENT_API.md** - API reference
- **DELIVERY_SUMMARY.md** - What's included
- **Code Comments** - Inline documentation

---

## Production Build

```bash
npm run build
```

Creates optimized bundle in `dist/` folder ready for deployment.

---

**Ready to use! 🚀**

Start by running: `npm run dev`
