# YogMitra

AI-assisted yoga posture analysis web app with session-based scoring, live coaching, and report generation.

## What This Project Does

YogMitra helps a user practice Konasana using webcam-based pose detection and a trained classifier.

- Detects pose landmarks using MoveNet in the browser.
- Classifies posture quality as `correct`, `moderate`, or `incorrect`.
- Tracks a full practice session (not just one frame).
- Shows live coaching cues during the session.
- Computes session score/result at session end.
- Generates a detailed practice report through backend report API.
- Falls back to a local detailed report when OpenRouter quota is unavailable.

## What We Have Built So Far

### 1) Dataset and Training Pipeline

- Built a dataset generator from image folders:
  - `images/correct/`
  - `images/moderate/`
  - `images/incorrect/`
- Extracted 17 keypoints and flattened into features.
- Added indirect parameters:
  - age
  - flexibility (one-hot)
  - experience (one-hot)
- Trained a TensorFlow.js model and saved to:
  - `model/model.json`
  - `model/weights.bin`

### 2) Frontend App

- Login and Sign Up flow.
- User profile (indirect parameters).
- Profile persistence for returning users.
- Dashboard with:
  - tutorial panel
  - raw webcam view
  - marker overlay view
  - live prediction
  - live feedback
  - session controls

### 3) Session-Based Evaluation

- `Start Session` starts webcam + realtime analysis.
- `End Session` stops webcam and computes session summary.
- Session tracks:
  - stable posture checks
  - needs-adjustment checks
  - visibility quality checks
  - average score
  - final session result

### 4) Live Coaching Improvements

- Real-time coaching tips while session is active.
- Session monitor tips based on running trend.
- Better stability handling to avoid instant wrong label on brief tracking loss.
- Left-right direction robustness via mirrored + left-right swapped inference.
- Age-aware leniency for users above 50.

### 5) Backend Report API

- Added Express backend endpoint: `POST /api/report`
- Uses OpenRouter when available.
- If OpenRouter quota/rate is exceeded, returns a detailed local fallback report instead of failing.

## Project Structure

- `index.html` - App UI shell
- `styles.css` - Styling
- `main.js` - App orchestration, session logic, realtime pipeline usage
- `poseDetection.js` - MoveNet webcam pose stream
- `prediction.js` - Classifier loading and inference
- `feedback.js` - Rule-based feedback and score helpers
- `dashboard.js` - DOM rendering utilities
- `login.js` - Auth/profile/session persistence
- `report.js` - Frontend report API caller
- `server.js` - Express server + OpenRouter/fallback report endpoint
- `script.js` - Dataset generation script
- `train.js` - Model training script
- `pose_dataset.json` - Generated dataset

## Setup and Run

## Prerequisites

- Node.js installed
- Webcam access in browser

## Install dependencies

```bash
npm install
```

## Run (React + API together)

Build frontend and start backend (serves `dist`):

```powershell
npm run build
$env:PORT=8000
$env:OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY"
npm start
```

Open:

- `http://localhost:8000`

## Run in development

Use two terminals:

Terminal 1 (API server):

```powershell
$env:PORT=8000
$env:OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY"
npm run server
```

Terminal 2 (React app with API proxy):

```powershell
npm run dev
```

Open:

- `http://localhost:5173`

## Set Permanent OpenRouter API Key (Windows)

If you do not want to set `$env:OPENROUTER_API_KEY` every time, set it once permanently:

```powershell
setx OPENROUTER_API_KEY "YOUR_OPENROUTER_KEY"
```

Then:

1. Close all open terminals.
2. Open a new terminal.
3. Run server normally:

```powershell
$env:PORT=8000
npm run server
```

Note: `setx` affects new terminals only (not the currently open one).

## How to Use

1. Sign in or sign up.
2. Complete profile once (age/flexibility/experience).
3. Click `Start Session` (webcam starts).
4. Practice Konasana and follow live coaching cues.
5. Click `End Session` (webcam stops, session summary appears).
6. Click `Generate Report` for detailed report.

## Session Scoring Logic (High Level)

- Per-check label scores are accumulated across session.
- Final result is decided by session average score.
- Uses stability and visibility safeguards to reduce noisy predictions.
- For age above 50, scoring and thresholds are slightly lenient.

## Report Behavior

- Primary: OpenRouter-generated detailed report.
- Fallback: detailed local report if OpenRouter is unavailable or quota-limited.

## Known Notes

- Current asana flow is focused on Konasana.
- OpenRouter output depends on API quota/billing availability.
- Best real-time results require full body visibility and stable lighting.

## Quick Dev Commands

Syntax checks:

```bash
node --check main.js
node --check server.js
node --check login.js
```

## Repository

- GitHub: https://github.com/purabpuraswani/yogamita-
