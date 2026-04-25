# Mental Module - Complete Setup & Testing Guide

## ✅ What's Been Implemented

### 1. **Pose Detection Pipeline**
- MoveNet Lightning model with real-time keypoint detection (17 points)
- Proper confidence filtering (minConfidence: 0.45)
- Canvas visualization with skeleton and keypoints

### 2. **Angle Extraction & Analysis**
- 8 joint angles: left/right elbows, shoulders, knees, hips, spine
- Improved angle calculation with confidence checking
- Comparison against ideal pose angles for each asana

### 3. **Session Tracking**
- Real-time accuracy scoring (0-100)
- Pose status classification: CORRECT (75+), NEUTRAL (50-74), INCORRECT (<50)
- Frame-by-frame metrics collection
- Corrections tracking

### 4. **Feedback System**
- Real-time posture feedback based on angle deviations
- Adjustable feedback threshold (currently 12 degrees)
- Mental wellness-focused messages

### 5. **Report Generation**
- `/api/mental/report` endpoint with OpenRouter AI integration
- Fallback report generation if API unavailable
- Includes accuracy analysis, mental wellness benefits, improvement areas

### 6. **Live Practice UI**
- Single pose detector with skeleton visualization
- Real-time metrics display
- Asana information panel
- Session controls (Start/End)
- Live feedback and coaching

### 7. **Report View**
- Summary statistics (accuracy, angle error, confidence)
- Detailed AI-generated recommendations
- Mental wellness insights
- Next session guidance

---

## 🚀 How to Use

### Starting the App
```bash
# Terminal 1: Frontend Dev Server
npm run dev

# Terminal 2: Backend Server
npm run server
```

### Testing the Full Pipeline

1. **Navigate to Mental Module**
   - Log in or sign up
   - Click "Mental Health Yoga Dashboard"

2. **Start a Live Practice Session**
   - Click "Open Live Practice"
   - Select an asana (Tadasana, Konasana, or Trikonasana)
   - Allow camera access
   - Click "Start Session"

3. **Perform the Yoga Pose**
   - Stand in front of your camera
   - Assume the selected pose
   - Watch the skeleton visualization on screen
   - Read real-time feedback at bottom

4. **Monitor Your Performance**
   - **Pose Status**: Shows if form is CORRECT, NEUTRAL, or INCORRECT
   - **Accuracy Score**: Real-time 0-100 score
   - **Keypoints**: Detected joints (should be 17/17)
   - **Live Feedback**: Specific corrections needed

5. **End Session & Generate Report**
   - Click "End Session"
   - Click "Generate Report"
   - View AI-generated analysis and recommendations

---

## 🎯 Key Features

### Angle-Based Scoring
- **Formula**: 60% angle accuracy + 40% detection confidence
- **Thresholds**:
  - CORRECT: ≥75 score
  - NEUTRAL: 50-74 score
  - INCORRECT: <50 score

### Real-Time Feedback
Triggered when angle errors exceed 12 degrees:
- "Straighten your left elbow"
- "Adjust your left shoulder position"
- "Keep your left leg straight"
- etc.

### Session Metrics
- Total frames analyzed
- Average accuracy score
- Average angle error (degrees)
- Best/worst scores
- Detection confidence average

### Mental Wellness Focus
Each asana includes:
- Mental health benefits
- Stress reduction techniques
- Nervous system regulation info
- Breathing guidance
- Practice recommendations

---

## 🔧 Customization

### Adjust Feedback Threshold
In `src/modules/mental/MentalApp.jsx` line ~211:
```javascript
const FEEDBACK_THRESHOLD = 12; // Change this value (in degrees)
```
- Higher = less feedback (fewer corrections)
- Lower = more feedback (stricter)

### Change Ideal Pose Angles
In `src/modules/mental/MentalApp.jsx` lines 5-9:
```javascript
const IDEAL_POSES = {
  Tadasana:   [170, 170,  90,  90, 170, 170, 170, 180],
  Konasana:   [140, 140, 110, 110, 170, 170, 165, 160],
  Trikonasana:[170, 170, 100, 100, 170, 170, 160, 150],
};
```
Format: [left_elbow, right_elbow, left_shoulder, right_shoulder, left_knee, right_knee, hip, spine]

### Modify Scoring Weights
In `MentalApp.jsx` line ~223:
```javascript
const score = Math.max(0, Math.min(100, angleAcc * 0.6 + stabilityScore * 0.4));
//                                                  ^^^                    ^^^
//                              Angle weight (60%)      Confidence weight (40%)
```

---

## 📊 API Endpoints

### Report Generation
**POST** `/api/mental/report`
```json
{
  "asana": "Tadasana",
  "accuracy": 82.5,
  "angles": {
    "avgError": 8.3,
    "correctionCounts": { "correction message": count }
  },
  "timing": {
    "framesCaptured": 180,
    "sessionDurationSec": 6
  },
  "stability": 0.87
}
```

### Chat with Wellness Assistant
**POST** `/api/mental/chat`
```json
{
  "question": "How do I improve my posture?",
  "context": {
    "selectedAsana": "Tadasana",
    "asanaInfo": { name, description, faqs },
    "session": { avgScore, avgAngleError }
  }
}
```

---

## 📝 Troubleshooting

### Images Not Showing
- Verify images in: `/public/assets/yoga-poses/`
- Required files: `pose-neutral.png`, `pose-arms-raised.png`, `pose-stretch.png`
- Refresh browser (Ctrl+Shift+R)

### Video Not Playing
- Check: `/public/assets/videos/tadasana-video.mp4`
- Ensure backend server is running (`npm run server`)
- Refresh browser

### Chat Not Responding
- Verify `.env` has `OPENROUTER_API_KEY` set
- Check backend server logs
- Fallback response should appear even without API key

### Low Accuracy Scores
- Ensure full body visible in camera (head to feet)
- Good lighting is important
- Stand closer to camera
- Increase feedback threshold to see progress

### Keypoints Not Detected
- Check camera permissions
- Ensure camera is working
- Try different lighting
- Clear browser cache

---

## 🎓 Understanding the Metrics

### Accuracy Score
- Based on how close your angles match the ideal pose
- Combines angle accuracy (60%) and detection confidence (40%)
- Higher is better (0-100 scale)

### Angle Error
- Average deviation from ideal angles in degrees
- Lower is better
- Helps identify specific problem areas

### Detection Confidence
- How confident the model is in detecting each keypoint
- Expressed as percentage (0-100%)
- Lower confidence may indicate camera/lighting issues

### Pose Status
- **CORRECT** (≥75): Excellent form, maintain current position
- **NEUTRAL** (50-74): Good effort, room for improvement
- **INCORRECT** (<50): Needs significant form adjustment

---

## 🚀 Next Steps

1. **Test Full Pipeline**: Complete a full session from start to report
2. **Review Report**: Check AI-generated insights
3. **Ask Chatbot**: Use wellness assistant for personalized guidance
4. **Multi-Session**: Track progress across multiple sessions
5. **Customize Poses**: Adjust ideal angles for your flexibility level

---

## 📞 Support

For issues or improvements, check:
- Browser console for errors
- Backend server logs
- Camera/microphone permissions
- `.env` configuration

Enjoy your yoga practice! 🧘‍♀️
