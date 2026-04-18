import React, { useState } from "react";
import PoseDetectorComponent from "./components/PoseDetectorComponent";
import { calculateJointAngles, compareAngles } from "./utils/angleUtils";
import { computeYogaScore } from "./utils/scoringUtils";
import "./App.css";

// Ideal joint angles for each asana
// Order: [left_elbow, right_elbow, left_shoulder, right_shoulder, left_knee, right_knee, hip, spine]
const IDEAL_POSES = {
  Tadasana: [
    170, // left_elbow - close to straight
    170, // right_elbow - close to straight
    90, // left_shoulder - at rest
    90, // right_shoulder - at rest
    170, // left_knee - straight
    170, // right_knee - straight
    170, // hip - neutral pelvis
    180, // spine - vertical
  ],
  Konasana: [
    140, // left_elbow - slightly bent
    140, // right_elbow - slightly bent
    110, // left_shoulder - raised
    110, // right_shoulder - raised
    170, // left_knee - straight
    170, // right_knee - straight
    165, // hip - slightly open
    160, // spine - bent to side
  ],
  Trikonasana: [
    170, // left_elbow - extended
    170, // right_elbow - extended
    100, // left_shoulder - open
    100, // right_shoulder - open
    170, // left_knee - straight
    170, // right_knee - straight
    160, // hip - open
    150, // spine - twisted/bent
  ],
};

// Feedback messages for angle corrections
const ANGLE_FEEDBACK = {
  0: "Straighten your left elbow more.",
  1: "Straighten your right elbow more.",
  2: "Adjust your left shoulder position.",
  3: "Adjust your right shoulder position.",
  4: "Keep your left leg straight.",
  5: "Keep your right leg straight.",
  6: "Align your hips properly.",
  7: "Keep your spine aligned vertically.",
};

const ASANA_CONTENT = {
  Konasana: {
    description:
      "Konasana stretches the side body, improves spinal flexibility, and supports balance and breath control.",
    focus: [
      "Reduces stress and anxiety through lateral body release",
      "Enhances emotional balance and nervous system regulation",
      "Promotes mental clarity and inner peace",
    ],
  },
  Tadasana: {
    description:
      "Tadasana builds foundational alignment through neutral spine, stable feet, and vertical balance.",
    focus: [
      "Grounds the mind and calms mental turbulence",
      "Builds confidence and mental stability",
      "Enhances mindfulness and body awareness",
    ],
  },
  Trikonasana: {
    description:
      "Trikonasana improves lateral flexibility and opens hips, hamstrings, and shoulders with controlled extension.",
    focus: [
      "Stimulates mental clarity and problem-solving abilities",
      "Relieves mental fatigue and emotional blockages",
      "Enhances focus, creativity and mental vitality",
    ],
  },
};

const TADASANA_FAQS = [
  {
    question: "What is the ideal foot position in Tadasana?",
    answer:
      "Keep both feet parallel with equal weight on all four corners of each foot. This creates a stable base and improves posture balance.",
  },
  {
    question: "How long should I hold Tadasana as a beginner?",
    answer:
      "Start with 20-30 seconds and gradually increase to 1-2 minutes while maintaining steady breathing and spinal alignment.",
  },
  {
    question: "Why does Tadasana matter for mental health?",
    answer:
      "Tadasana improves grounding and body awareness, which helps calm the nervous system, reduce stress, and build mindful focus.",
  },
  {
    question: "What are common mistakes in Tadasana?",
    answer:
      "Locking the knees, lifting the chin too high, and collapsing the lower back are common errors. Keep knees soft, spine long, and shoulders relaxed.",
  },
];

function App() {
  const [keypoints, setKeypoints] = useState([]);
  const [selectedAsana, setSelectedAsana] = useState("Tadasana");
  const [showTutorial, setShowTutorial] = useState(true);
  const [enableLiveAnalysis, setEnableLiveAnalysis] = useState(true);
  const [mirrorView, setMirrorView] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    totalDetections: 0,
    averageConfidence: 0,
  });
  const [sessionActive, setSessionActive] = useState(false);
  const [poseAccuracy, setPoseAccuracy] = useState(0);
  const [poseStatus, setPoseStatus] = useState("NEUTRAL");
  const [feedbackList, setFeedbackList] = useState([]);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState({
    frameCount: 0,
    angleErrorSum: 0,
    scoreSum: 0,
    bestScore: 0,
    worstScore: 10,
    correctionCounts: {},
  });

  function toPrettyLabel(feedback) {
    return String(feedback || "").trim();
  }

  function buildModalReportText(data) {
    if (!data) return "No report available.";
    if (typeof data.report === "string" && data.report.trim()) {
      return data.report;
    }

    const lines = [];
    if (data.summary) {
      lines.push("### Session Performance Summary");
      lines.push(String(data.summary));
      lines.push("");
    }
    if (Array.isArray(data.strengths) && data.strengths.length > 0) {
      lines.push("### Strengths");
      data.strengths.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
      lines.push("");
    }
    if (Array.isArray(data.improvements) && data.improvements.length > 0) {
      lines.push("### Improvements");
      data.improvements.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    }
    return lines.join("\n");
  }

  function handleKeypointsUpdate(newKeypoints) {
    setKeypoints(newKeypoints);

    if (newKeypoints.length > 0 && sessionActive) {
      const avgConfidence =
        newKeypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) /
        newKeypoints.length;
      setDetectionStats({
        totalDetections: detectionStats.totalDetections + 1,
        averageConfidence: avgConfidence,
      });

      // Calculate joint angles from detected keypoints
      const userAngles = calculateJointAngles(newKeypoints, 0.3);
      const idealAngles = IDEAL_POSES[selectedAsana];

      // Compare user angles with ideal angles
      const angleComparison = compareAngles(userAngles, idealAngles);
      const avgAngleError = angleComparison.avgError;

      // Generate feedback based on angle errors (errors > 15 degrees)
      const newFeedback = [];
      angleComparison.jointErrors.forEach((error, idx) => {
        if (error > 15) {
          newFeedback.push(ANGLE_FEEDBACK[idx]);
        }
      });

      // If no major errors, provide positive feedback
      if (newFeedback.length === 0) {
        newFeedback.push("Good posture! Keep it steady.");
      }

      setFeedbackList(newFeedback);

      // Calculate accuracy score (0-100)
      // Based on how close the average angle error is to acceptable (max 20 degrees)
      const angleAccuracy = Math.max(0, 100 - avgAngleError * 3);

      // Use scoring utility to calculate final score
      const scoreResult = computeYogaScore({
        classificationAccuracy: angleAccuracy,
        angleError: avgAngleError,
        timingDeviation: 0,
        stabilityScore: avgConfidence * 100,
        config: {
          maxAngleError: 30,
          weights: {
            accuracy: 0.4,
            angle: 0.4,
            timing: 0.1,
            stability: 0.1,
          },
        },
      });

      // Scale to 0-10 for display
      const displayScore = (scoreResult.finalScore / 100) * 10;
      setPoseAccuracy(displayScore.toFixed(1));

      setSessionMetrics((prev) => {
        const nextCorrections = { ...prev.correctionCounts };
        newFeedback.forEach((msg) => {
          const key = toPrettyLabel(msg);
          if (!key) return;
          nextCorrections[key] = (nextCorrections[key] || 0) + 1;
        });

        return {
          frameCount: prev.frameCount + 1,
          angleErrorSum: prev.angleErrorSum + avgAngleError,
          scoreSum: prev.scoreSum + displayScore,
          bestScore: Math.max(prev.bestScore, displayScore),
          worstScore: Math.min(prev.worstScore, displayScore),
          correctionCounts: nextCorrections,
        };
      });

      // Set status based on score
      if (displayScore >= 7) {
        setPoseStatus("CORRECT");
      } else if (displayScore >= 5) {
        setPoseStatus("NEUTRAL");
      } else {
        setPoseStatus("INCORRECT");
      }
    }
  }

  function startSession() {
    setSessionActive(true);
    setFeedbackList([]);
    setPoseAccuracy(0);
    setPoseStatus("NEUTRAL");
    setSessionSummary(null);
    setReportData(null);
    setDetectionStats({
      totalDetections: 0,
      averageConfidence: 0,
    });
    setSessionMetrics({
      frameCount: 0,
      angleErrorSum: 0,
      scoreSum: 0,
      bestScore: 0,
      worstScore: 10,
      correctionCounts: {},
    });
  }

  function endSession() {
    setSessionActive(false);
    const frameCount = Math.max(1, sessionMetrics.frameCount);
    const avgScore = sessionMetrics.scoreSum / frameCount;
    const avgAngleError = sessionMetrics.angleErrorSum / frameCount;

    setSessionSummary({
      totalFrames: detectionStats.totalDetections,
      accuracy: avgScore,
      status: poseStatus,
      avgAngleError,
      bestScore: sessionMetrics.bestScore,
      worstScore: sessionMetrics.worstScore,
      correctionCounts: sessionMetrics.correctionCounts,
    });
  }

  function generateReport() {
    if (!sessionSummary) {
      alert("No session data available. Please end a session first.");
      return;
    }

    setReportLoading(true);

    const frameCount = Math.max(1, sessionMetrics.frameCount);
    const avgScore = sessionMetrics.scoreSum / frameCount;
    const avgAngleError = sessionMetrics.angleErrorSum / frameCount;
    const approxDurationSec = Number((frameCount / 30).toFixed(1));

    // Prepare numeric metrics for detailed report generation
    const reportPayload = {
      asana: selectedAsana,
      accuracy: Number((avgScore * 10).toFixed(2)),
      angles: {
        avgError: Number(avgAngleError.toFixed(2)),
        correctionCounts: sessionMetrics.correctionCounts,
      },
      timing: {
        framesCaptured: sessionMetrics.frameCount,
        sessionDurationSec: approxDurationSec,
      },
      stability: detectionStats.averageConfidence * 100,
      session_duration: approxDurationSec,
    };

    // Call the backend API
    fetch("http://localhost:4000/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportPayload),
    })
      .then((res) => res.json())
      .then((data) => {
        setReportData(data);
        setReportLoading(false);
      })
      .catch((error) => {
        console.error("Error generating report:", error);
        setReportLoading(false);
        alert("Failed to generate report. Please try again.");
      });
  }

  const currentAsana = ASANA_CONTENT[selectedAsana];

  return (
    <div className="dashboard-page">
      <header className="hero-card glass-card">
        <div>
          <h1>AI Yoga Pose Detection</h1>
          <p className="hero-subtitle">Welcome, Mira</p>
          <p className="hero-caption">
            Select asana, load your tutorial video, and run live binary
            analysis.
          </p>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="left-column">
          <article className="glass-card card-block">
            <h2>Asana Selection</h2>
            <label className="field-label" htmlFor="asana-select">
              Select Asana
            </label>
            <select
              id="asana-select"
              className="dark-input"
              value={selectedAsana}
              onChange={(e) => setSelectedAsana(e.target.value)}
            >
              {Object.keys(ASANA_CONTENT).map((asana) => (
                <option key={asana} value={asana}>
                  {asana}
                </option>
              ))}
            </select>

            <div className="info-panel-box">
              <h3>Description</h3>
              <p>{currentAsana.description}</p>
            </div>

            <div className="info-panel-box">
              <h3>Main Focus</h3>
              <ul>
                {currentAsana.focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>

          <article className="glass-card card-block">
            <h2>Binary Options</h2>
            <div className="binary-row">
              <span>Show Tutorial Video</span>
              <div className="binary-group">
                <button
                  type="button"
                  className={showTutorial ? "binary-btn active" : "binary-btn"}
                  onClick={() => setShowTutorial(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={!showTutorial ? "binary-btn active" : "binary-btn"}
                  onClick={() => setShowTutorial(false)}
                >
                  No
                </button>
              </div>
            </div>

            <div className="binary-row">
              <span>Enable Live Analysis</span>
              <div className="binary-group">
                <button
                  type="button"
                  className={
                    enableLiveAnalysis ? "binary-btn active" : "binary-btn"
                  }
                  onClick={() => setEnableLiveAnalysis(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={
                    !enableLiveAnalysis ? "binary-btn active" : "binary-btn"
                  }
                  onClick={() => setEnableLiveAnalysis(false)}
                >
                  No
                </button>
              </div>
            </div>

            <div className="binary-row">
              <span>Mirror Camera View</span>
              <div className="binary-group">
                <button
                  type="button"
                  className={mirrorView ? "binary-btn active" : "binary-btn"}
                  onClick={() => setMirrorView(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={!mirrorView ? "binary-btn active" : "binary-btn"}
                  onClick={() => setMirrorView(false)}
                >
                  No
                </button>
              </div>
            </div>
          </article>

          <article className="glass-card card-block">
            <h2>Tadasana FAQs</h2>
            <div className="faq-list">
              {TADASANA_FAQS.map((faq, idx) => (
                <div className="faq-item" key={faq.question}>
                  <button
                    type="button"
                    className="faq-toggle"
                    onClick={() =>
                      setOpenFaqIndex((prev) => (prev === idx ? -1 : idx))
                    }
                  >
                    <h3>{faq.question}</h3>
                    <span
                      className={
                        openFaqIndex === idx ? "faq-icon open" : "faq-icon"
                      }
                    >
                      {openFaqIndex === idx ? "-" : "+"}
                    </span>
                  </button>
                  {openFaqIndex === idx && <p>{faq.answer}</p>}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="right-column">
          <article className="glass-card card-block">
            <div className="card-head-row">
              <h2>Instructor Tutorial</h2>
              <span className="status-pill">
                {showTutorial ? "Visible" : "Hidden"}
              </span>
            </div>

            {showTutorial ? (
              <div className="tutorial-frame">
                <video
                  className="tutorial-video"
                  src="/yoga.mp4"
                  controls
                  playsInline
                />
              </div>
            ) : (
              <div className="empty-state">Tutorial video is turned off.</div>
            )}
          </article>

          <article className="glass-card card-block">
            <div className="card-head-row">
              <h2>Live Practice</h2>
              <span className={`status-pill ${poseStatus.toLowerCase()}`}>
                {sessionActive ? poseStatus : "Paused"}
              </span>
            </div>

            {enableLiveAnalysis ? (
              <>
                {/* Two Video Layout */}
                <div className="live-practice-grid">
                  <div className="video-container">
                    <p className="video-label">Webcam (Raw)</p>
                    <div
                      className={`video-frame ${mirrorView ? "mirror-wrap" : ""}`}
                    >
                      {sessionActive ? (
                        <PoseDetectorComponent
                          onKeypointsUpdate={handleKeypointsUpdate}
                          options={{
                            modelType: "lite",
                            frameSkip: 1,
                            minConfidence: 0.5,
                            targetFPS: 30,
                            showDebugInfo: false,
                            showSkeleton: false,
                            hideUI: true,
                          }}
                        />
                      ) : (
                        <div className="empty-state camera-placeholder">
                          Click "Start Session" to begin
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="video-container">
                    <p className="video-label">Webcam (MoveNet Markers)</p>
                    <div
                      className={`video-frame ${mirrorView ? "mirror-wrap" : ""}`}
                    >
                      {sessionActive ? (
                        <PoseDetectorComponent
                          onKeypointsUpdate={handleKeypointsUpdate}
                          options={{
                            modelType: "lite",
                            frameSkip: 1,
                            minConfidence: 0.5,
                            targetFPS: 30,
                            showDebugInfo: false,
                            showSkeleton: true,
                            hideUI: true,
                          }}
                        />
                      ) : (
                        <div className="empty-state camera-placeholder">
                          Waiting for session...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prediction & Feedback Section */}
                <div className="prediction-section">
                  <div className="prediction-left">
                    <p className="prediction-label">Live Feedback</p>
                    <ul className="feedback-list">
                      {feedbackList.length > 0 ? (
                        feedbackList.map((feedback, idx) => (
                          <li key={idx}>{feedback}</li>
                        ))
                      ) : (
                        <li>Waiting for pose detection...</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Session Controls */}
                <div className="session-controls">
                  <button
                    className="session-btn start-btn"
                    onClick={startSession}
                    disabled={sessionActive}
                  >
                    Start Session
                  </button>
                  <button
                    className="session-btn end-btn"
                    onClick={endSession}
                    disabled={!sessionActive}
                  >
                    End Session
                  </button>
                </div>

                {/* Session Summary */}
                <div className="session-summary">
                  <p className="summary-label">Session Summary</p>
                  {sessionSummary ? (
                    <>
                      <p className="summary-text">
                        <span>Live Coach</span>
                        <span>
                          Move back slightly and keep full body in frame for
                          accurate pose analysis.
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="summary-empty">No session completed yet.</p>
                  )}
                </div>

                {/* Report Generation */}
                <div className="report-controls">
                  <button
                    className="report-btn generate-btn"
                    onClick={generateReport}
                    disabled={!sessionSummary}
                  >
                    Generate Report
                  </button>
                  <button
                    className="report-btn download-btn"
                    disabled={!sessionSummary}
                  >
                    Download Report
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">Live analysis is turned off.</div>
            )}
          </article>
        </section>
      </main>

      {/* Report Modal */}
      {reportData && (
        <div className="report-modal-overlay">
          <div className="report-modal">
            <div className="report-modal-header">
              <h2>{selectedAsana} Session Report</h2>
              <button className="close-btn" onClick={() => setReportData(null)}>
                ✕
              </button>
            </div>
            <div className="report-modal-content">
              {reportLoading ? (
                <div className="report-loading">Generating report...</div>
              ) : (
                <div className="report-text">
                  {buildModalReportText(reportData)}
                </div>
              )}
            </div>
            <div className="report-modal-footer">
              <button
                className="report-btn download-btn"
                onClick={() => {
                  // Create a text file and download
                  const element = document.createElement("a");
                  const file = new Blob([buildModalReportText(reportData)], {
                    type: "text/plain",
                  });
                  element.href = URL.createObjectURL(file);
                  element.download = `${selectedAsana}_Report.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                Download Report
              </button>
              <button
                className="session-btn end-btn"
                onClick={() => setReportData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="metrics-strip glass-card">
        <div>
          <span>Keypoints</span>
          <strong>{keypoints.length}/17</strong>
        </div>
        <div>
          <span>Avg Confidence</span>
          <strong>{detectionStats.averageConfidence.toFixed(2)}</strong>
        </div>
        <div>
          <span>Total Detections</span>
          <strong>{detectionStats.totalDetections}</strong>
        </div>
      </footer>
    </div>
  );
}

export default App;
