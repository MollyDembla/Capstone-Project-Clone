import React, { useState, useEffect, useRef } from 'react';

// ── Ideal joint angles (same order as sedentary module)
// [left_elbow, right_elbow, left_shoulder, right_shoulder, left_knee, right_knee, hip, spine]
const IDEAL_POSES = {
  Tadasana:   [170, 170,  90,  90, 170, 170, 170, 180],
  Konasana:   [140, 140, 110, 110, 170, 170, 165, 160],
  Trikonasana:[170, 170, 100, 100, 170, 170, 160, 150],
};

const ANGLE_FEEDBACK = {
  0: 'Straighten your left elbow.',
  1: 'Straighten your right elbow.',
  2: 'Adjust your left shoulder position.',
  3: 'Adjust your right shoulder position.',
  4: 'Keep your left leg straight.',
  5: 'Keep your right leg straight.',
  6: 'Align your hips properly.',
  7: 'Keep your spine vertical and aligned.',
};

const ASANA_CATALOG = {
  Tadasana: {
    description: 'Tadasana (Mountain Pose) builds foundational alignment through neutral spine, stable feet, and vertical balance. It grounds the mind and promotes full body awareness.',
    focus: [
      'Grounds the mind and calms mental turbulence',
      'Builds confidence and mental stability',
      'Enhances mindfulness and full-body awareness',
    ],
    faqs: [
      { q: 'What is the ideal foot position in Tadasana?', a: 'Keep both feet parallel with equal weight on all four corners. This creates a stable base and improves posture balance.' },
      { q: 'How long should I hold Tadasana?', a: 'Start with 20–30 seconds and gradually increase to 1–2 minutes while maintaining steady breathing.' },
      { q: 'Why does Tadasana matter for mental health?', a: 'It improves grounding and body awareness, which helps calm the nervous system, reduce stress, and build mindful focus.' },
      { q: 'What are common mistakes?', a: 'Locking the knees, lifting the chin too high, and collapsing the lower back. Keep knees soft, spine long, and shoulders relaxed.' },
    ],
  },
  Konasana: {
    description: 'Konasana (Angle Pose) stretches the side body, improves spinal flexibility, and supports balance and breath control. It reduces stress through lateral body release.',
    focus: [
      'Reduces stress and anxiety through lateral release',
      'Enhances emotional balance and nervous system regulation',
      'Promotes mental clarity and inner peace',
    ],
    faqs: [
      { q: 'Should my knees bend?', a: 'Keep both knees straight but not locked.' },
      { q: 'How far should I bend?', a: 'Bend until you feel a stretch without collapsing your chest.' },
      { q: 'Where should my gaze be?', a: 'Look forward or slightly upward while keeping the neck relaxed.' },
      { q: 'What muscles does it target?', a: 'Obliques, core, shoulders, arms, hamstrings and inner thighs.' },
    ],
  },
  Trikonasana: {
    description: 'Trikonasana (Triangle Pose) improves lateral flexibility and opens hips, hamstrings, and shoulders. It stimulates mental clarity and relieves emotional blockages.',
    focus: [
      'Stimulates mental clarity and problem-solving abilities',
      'Relieves mental fatigue and emotional blockages',
      'Enhances focus, creativity, and mental vitality',
    ],
    faqs: [
      { q: 'How wide should my stance be?', a: 'Roughly 3–4 feet apart, with your front foot pointing forward and back foot at about 90 degrees.' },
      { q: 'How low should I reach?', a: 'Reach down to your shin, ankle, or the floor — only as far as you can without bending your torso forward.' },
      { q: 'Is it normal to feel tightness in the hamstrings?', a: 'Yes. Mild tightness is expected. Never force the stretch past comfort.' },
      { q: 'Can Trikonasana help with anxiety?', a: 'Yes. The lateral extension and deep breathing activate the parasympathetic nervous system, reducing anxiety.' },
    ],
  },
};

// ── Utility: calculate approximate joint angles from MoveNet keypoints
function angleBetween(a, b, c) {
  if (!a || !b || !c) return 0;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (magAB === 0 || magCB === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

function extractAngles(kps) {
  // MoveNet keypoint indices
  const [nose,le,re,ls,rs,lel,rel,lwr,rwr,lhi,rhi,lkn,rkn,lan,ran] =
    [0,1,2,5,6,7,8,9,10,11,12,13,14,15,16].map(i => kps[i]);
  const midHip = lhi && rhi ? { x:(lhi.x+rhi.x)/2, y:(lhi.y+rhi.y)/2, score:1 } : null;
  const midShoulder = ls && rs ? { x:(ls.x+rs.x)/2, y:(ls.y+rs.y)/2, score:1 } : null;

  return [
    angleBetween(ls, lel, lwr),   // 0 left_elbow
    angleBetween(rs, rel, rwr),   // 1 right_elbow
    angleBetween(lel, ls, lhi),   // 2 left_shoulder
    angleBetween(rel, rs, rhi),   // 3 right_shoulder
    angleBetween(lhi, lkn, lan),  // 4 left_knee
    angleBetween(rhi, rkn, ran),  // 5 right_knee
    angleBetween(midShoulder, midHip, rkn || lkn),  // 6 hip
    angleBetween(nose, midShoulder, midHip),         // 7 spine
  ];
}

// ── Lazy load the PoseDetectorComponent from the mental module ──
// We import it as a regular React component
import PoseDetectorComponent from './Yoga-Pose Detection/frontend/src/components/PoseDetectorComponent.jsx';

export default function MentalApp({ userName = 'User', onLogout }) {
  // View state: 'dashboard' | 'livePractice' | 'report'
  const [view, setView] = useState('dashboard');
  const [selectedAsana, setSelectedAsana] = useState('Tadasana');
  const [openFaqIdx, setOpenFaqIdx] = useState(-1);

  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [keypoints, setKeypoints] = useState([]);
  const [poseAccuracy, setPoseAccuracy] = useState(0);
  const [poseStatus, setPoseStatus] = useState('NEUTRAL');
  const [feedbackList, setFeedbackList] = useState([]);
  const [sessionSummary, setSessionSummary] = useState(null);
  const metricsRef = useRef({ frameCount:0, scoreSum:0, angleSum:0, bestScore:0, worstScore:100, corrections:{} });
  const detStatsRef = useRef({ totalDetections:0, avgConf:0 });

  // Report state
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role:'bot', text:'Hi! Ask me anything about your session, pose corrections, or mental wellness yoga.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef(null);

  const currentAsana = ASANA_CATALOG[selectedAsana];

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:'smooth' });
  }, [chatMessages]);

  // ── Keypoints handler ──────────────────────────────────────────
  function handleKeypoints(newKps) {
    setKeypoints(newKps);
    if (!sessionActive || !newKps || newKps.length < 17) return;

    const avgConf = newKps.reduce((s, k) => s + (k.score || 0), 0) / newKps.length;
    detStatsRef.current = {
      totalDetections: detStatsRef.current.totalDetections + 1,
      avgConf,
    };

    const userAngles = extractAngles(newKps);
    const idealAngles = IDEAL_POSES[selectedAsana] || IDEAL_POSES.Tadasana;
    const errors = userAngles.map((a, i) => Math.abs(a - idealAngles[i]));
    const avgError = errors.reduce((s, e) => s + e, 0) / errors.length;

    const fb = [];
    errors.forEach((e, i) => { if (e > 15) fb.push(ANGLE_FEEDBACK[i]); });
    if (fb.length === 0) fb.push('Great posture! Keep it steady.');
    setFeedbackList(fb);

    const angleAcc = Math.max(0, 100 - avgError * 3);
    const stabilityScore = avgConf * 100;
    const score = Math.max(0, Math.min(100, angleAcc * 0.6 + stabilityScore * 0.4));
    setPoseAccuracy(score.toFixed(1));
    setPoseStatus(score >= 70 ? 'CORRECT' : score >= 45 ? 'NEUTRAL' : 'INCORRECT');

    const m = metricsRef.current;
    const nextCorrections = { ...m.corrections };
    fb.forEach(msg => { nextCorrections[msg] = (nextCorrections[msg] || 0) + 1; });
    metricsRef.current = {
      frameCount: m.frameCount + 1,
      scoreSum: m.scoreSum + score,
      angleSum: m.angleSum + avgError,
      bestScore: Math.max(m.bestScore, score),
      worstScore: Math.min(m.worstScore, score),
      corrections: nextCorrections,
    };
  }

  // ── Session controls ──────────────────────────────────────────
  function startSession() {
    metricsRef.current = { frameCount:0, scoreSum:0, angleSum:0, bestScore:0, worstScore:100, corrections:{} };
    detStatsRef.current = { totalDetections:0, avgConf:0 };
    setFeedbackList([]);
    setPoseAccuracy(0);
    setPoseStatus('NEUTRAL');
    setSessionSummary(null);
    setReportText('');
    setSessionActive(true);
  }

  function endSession() {
    setSessionActive(false);
    const m = metricsRef.current;
    const fc = Math.max(1, m.frameCount);
    setSessionSummary({
      asana: selectedAsana,
      totalFrames: detStatsRef.current.totalDetections,
      avgScore: (m.scoreSum / fc).toFixed(1),
      avgAngleError: (m.angleSum / fc).toFixed(1),
      bestScore: m.bestScore.toFixed(1),
      worstScore: m.worstScore.toFixed(1),
      corrections: m.corrections,
      status: poseStatus,
    });
  }

  // ── Report ───────────────────────────────────────────────────
  async function generateReport() {
    if (!sessionSummary) return;
    setReportLoading(true);
    setView('report');

    const payload = {
      asana: sessionSummary.asana,
      accuracy: parseFloat(sessionSummary.avgScore),
      angles: { avgError: parseFloat(sessionSummary.avgAngleError), correctionCounts: sessionSummary.corrections },
      timing: { framesCaptured: sessionSummary.totalFrames, sessionDurationSec: (sessionSummary.totalFrames / 30).toFixed(1) },
      stability: detStatsRef.current.avgConf * 100,
    };

    try {
      const res = await fetch('/api/mental/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setReportText(data.report || buildLocalReport(sessionSummary));
    } catch {
      setReportText(buildLocalReport(sessionSummary));
    } finally {
      setReportLoading(false);
    }
  }

  function buildLocalReport(s) {
    const topCorrections = Object.entries(s.corrections || {})
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([msg]) => `- ${msg}`)
      .join('\n') || '- No specific corrections recorded.';

    return `## Mental Health Yoga Session Report

**Asana:** ${s.asana}
**Average Score:** ${s.avgScore} / 100
**Best Score:** ${s.bestScore} | **Worst Score:** ${s.worstScore}
**Average Angle Error:** ${s.avgAngleError}°
**Total Frames Analyzed:** ${s.totalFrames}
**Final Status:** ${s.status}

## Top Corrections Needed
${topCorrections}

## Recommendations
- Focus on maintaining a neutral spine and slow, deep breaths throughout the pose.
- Practice in front of a mirror to self-correct shoulder and hip alignment.
- Hold each pose for 20–30 seconds longer in your next session.
- Pair with 5 minutes of pranayama (alternate nostril breathing) before practice.
- Maintain consistent practice 4–5 days per week for mental wellness benefits.

## Next Session Goals
- Aim for an average score ≥ ${Math.min(100, parseFloat(s.avgScore) + 8).toFixed(0)}/100
- Reduce average angle error to ≤ ${Math.max(5, parseFloat(s.avgAngleError) - 3).toFixed(1)}°
- Increase hold duration by 10 seconds per pose`;
  }

  function downloadReport() {
    if (!reportText) return;
    const a = document.createElement('a');
    const blob = new Blob([reportText], { type:'text/plain' });
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedAsana}_Mental_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Chatbot ──────────────────────────────────────────────────
  async function sendChat(e) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;
    setChatMessages(prev => [...prev, { role:'user', text:q }]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await fetch('/api/mental/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            selectedAsana,
            asanaInfo: { name: selectedAsana, description: currentAsana.description, faqs: currentAsana.faqs.map(f => f.q+' '+f.a) },
            session: sessionSummary,
          },
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role:'bot', text: data.reply || 'No response received.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role:'bot', text:'Network error. Please check your connection and try again.' }]);
    } finally {
      setChatSending(false);
    }
  }

  const statusColor = poseStatus === 'CORRECT' ? 'var(--accent)' : poseStatus === 'INCORRECT' ? 'var(--bad)' : 'var(--warn)';

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', padding: view === 'livePractice' ? '0' : '12px', display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* ── DASHBOARD VIEW ───────────────────────────────── */}
      {view === 'dashboard' && (
        <>
          <header className="header">
            <div className="header-top">
              <div className="header-brand">
                <img src="/logo.png" alt="YogMitra" className="dashboard-logo" />
                <h1>Mental Health Yoga Dashboard</h1>
              </div>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ color:'var(--muted)', fontSize:'0.9rem' }}>🧠 Mental Module</span>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
            <p style={{ margin:'6px 0 0', color:'var(--muted)' }}>Welcome, {userName} — Yoga for mental wellness and clarity.</p>
          </header>

          <div className="dashboard-grid" style={{ gridTemplateColumns:'400px 1fr' }}>
            {/* LEFT PANEL */}
            <aside className="panel left-panel">
              <h2>Asana Selection</h2>
              <label>Select Asana
                <select value={selectedAsana} onChange={e => { setSelectedAsana(e.target.value); setOpenFaqIdx(-1); }}>
                  {Object.keys(ASANA_CATALOG).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>

              <div className="info-box">
                <h3>Description</h3>
                <p>{currentAsana.description}</p>
              </div>

              <div className="info-box">
                <h3>Mental Focus Areas</h3>
                <ul>{currentAsana.focus.map(f => <li key={f}>{f}</li>)}</ul>
              </div>

              <div className="info-box">
                <h3>FAQs</h3>
                <div className="faq-container">
                  {currentAsana.faqs.map((faq, i) => (
                    <div key={i} className="faq-item">
                      <div className="faq-q" style={{ cursor:'pointer' }} onClick={() => setOpenFaqIdx(openFaqIdx === i ? -1 : i)}>
                        {faq.q} <span style={{ float:'right', color:'var(--accent)' }}>{openFaqIdx === i ? '−' : '+'}</span>
                      </div>
                      {openFaqIdx === i && <div className="faq-a">{faq.a}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* RIGHT PANEL */}
            <section className="panel right-panel">
              <div className="info-box live-practice-link-box">
                <h3>🧘 Live Practice</h3>
                <p>Open the live practice page to start real-time pose detection with webcam tracking, angle feedback, and session analysis for mental wellness yoga.</p>
                <button className="open-live-practice-btn" onClick={() => setView('livePractice')}>Open Live Practice</button>
              </div>

              {/* User Stats */}
              <div className="info-box user-stats-box">
                <h3><span role="img" aria-label="stats">📊</span> Session Overview</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Selected Asana</div>
                    <div className="stat-value" style={{ fontSize:'1.1rem' }}>{selectedAsana}</div>
                    <div className="stat-subtext">current</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Module</div>
                    <div className="stat-value" style={{ fontSize:'1.1rem' }}>Mental</div>
                    <div className="stat-subtext">wellness yoga</div>
                  </div>
                </div>
                {sessionSummary && (
                  <div style={{ marginTop:'12px', padding:'10px', background:'rgba(5,16,27,0.5)', borderRadius:'10px', border:'1px solid var(--stroke)' }}>
                    <h4 style={{ margin:'0 0 8px', color:'var(--accent)', fontSize:'0.95rem' }}>Last Session</h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', fontSize:'0.88rem', color:'var(--muted)' }}>
                      <span>Avg Score: <strong style={{ color:'var(--text)' }}>{sessionSummary.avgScore}/100</strong></span>
                      <span>Avg Angle Err: <strong style={{ color:'var(--text)' }}>{sessionSummary.avgAngleError}°</strong></span>
                      <span>Best: <strong style={{ color:'var(--accent)' }}>{sessionSummary.bestScore}</strong></span>
                      <span>Frames: <strong style={{ color:'var(--text)' }}>{sessionSummary.totalFrames}</strong></span>
                    </div>
                    <button style={{ marginTop:'10px', width:'100%' }} onClick={generateReport}>View Report</button>
                  </div>
                )}
              </div>

              {/* Chatbot panel */}
              <div className="info-box" style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h3>🤖 Wellness Assistant</h3>
                  <button className="secondary-nav-btn" onClick={() => setChatOpen(!chatOpen)} style={{ padding:'6px 10px', fontSize:'0.82rem' }}>
                    {chatOpen ? 'Hide Chat' : 'Open Chat'}
                  </button>
                </div>
                {chatOpen && (
                  <>
                    <div style={{ height:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px', padding:'4px' }}>
                      {chatMessages.map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'}>
                          {m.text}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendChat} style={{ display:'flex', gap:'8px' }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about your session or mental yoga..." style={{ flex:1 }} />
                      <button type="submit" disabled={chatSending} style={{ padding:'8px 14px' }}>{chatSending ? '...' : 'Send'}</button>
                    </form>
                  </>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* ── LIVE PRACTICE VIEW ───────────────────────────── */}
      {view === 'livePractice' && (
        <div className="dashboard live-practice-view" style={{ padding:'12px', height:'100vh', overflow:'auto' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', background:'var(--card)', border:'1px solid var(--stroke)', borderRadius:'14px', padding:'10px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <img src="/logo.png" alt="YogMitra" style={{ width:'36px', height:'36px', objectFit:'contain' }} />
              <span style={{ fontWeight:700, fontSize:'1rem' }}>Live Practice — {selectedAsana}</span>
              <span style={{ fontSize:'0.8rem', color:statusColor, fontWeight:700, padding:'3px 8px', background:'rgba(0,0,0,0.3)', borderRadius:'999px' }}>{sessionActive ? poseStatus : 'Paused'}</span>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="secondary-nav-btn" onClick={() => setView('dashboard')}>← Dashboard</button>
              <button className="logout-btn" onClick={onLogout}>Logout</button>
            </div>
          </div>

          {/* 3-column layout */}
          <div className="live-top-row" style={{ marginBottom:'10px' }}>
            {/* Asana info card */}
            <div className="panel live-screen-card" style={{ padding:'12px', gridTemplateRows:'auto 1fr' }}>
              <div className="section-head">
                <h2 style={{ fontSize:'1rem' }}>Asana Info</h2>
                <select value={selectedAsana} onChange={e => setSelectedAsana(e.target.value)} style={{ fontSize:'0.82rem', padding:'4px 8px', background:'rgba(5,16,27,0.8)', color:'var(--text)', border:'1px solid var(--stroke)', borderRadius:'8px' }}>
                  {Object.keys(ASANA_CATALOG).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ overflowY:'auto' }}>
                <p style={{ fontSize:'0.83rem', color:'var(--muted)', lineHeight:'1.5', margin:'0 0 10px' }}>{currentAsana.description}</p>
                <div style={{ fontSize:'0.8rem', color:'var(--muted)' }}>
                  <strong style={{ color:'var(--accent)' }}>Mental Focus:</strong>
                  <ul style={{ margin:'6px 0 0', paddingLeft:'16px', display:'grid', gap:'4px' }}>
                    {currentAsana.focus.map(f => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Webcam Raw */}
            <div className="panel live-screen-card">
              <h3>Webcam (Raw)</h3>
              <div style={{ flex:1, background:'#000', borderRadius:'12px', overflow:'hidden', minHeight:'240px', position:'relative' }}>
                {sessionActive
                  ? <PoseDetectorComponent onKeypointsUpdate={handleKeypoints} options={{ modelType:'lite', frameSkip:1, minConfidence:0.5, targetFPS:30, showDebugInfo:false, showSkeleton:false, hideUI:true }} />
                  : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--muted)', fontSize:'0.85rem' }}>Click Start Session to begin</div>
                }
              </div>
            </div>

            {/* Webcam Markers */}
            <div className="panel live-screen-card">
              <h3>Webcam (Markers)</h3>
              <div style={{ flex:1, background:'#000', borderRadius:'12px', overflow:'hidden', minHeight:'240px', position:'relative' }}>
                {sessionActive
                  ? <PoseDetectorComponent onKeypointsUpdate={handleKeypoints} options={{ modelType:'lite', frameSkip:1, minConfidence:0.5, targetFPS:30, showDebugInfo:false, showSkeleton:true, hideUI:true }} />
                  : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--muted)', fontSize:'0.85rem' }}>Waiting for session…</div>
                }
              </div>
            </div>
          </div>

          {/* Session Controls */}
          <div className="live-session-controls-row" style={{ marginBottom:'10px' }}>
            <button onClick={startSession} disabled={sessionActive}>Start Session</button>
            <button onClick={endSession} disabled={!sessionActive}>End Session</button>
            <button className="secondary-nav-btn" onClick={generateReport} disabled={!sessionSummary}>Generate Report</button>
          </div>
          <p className="camera-guide-text">Keep your full body visible: head, both palms, and both feet in frame.</p>

          {/* Stats Row */}
          <div className="live-stats-row" style={{ marginBottom:'10px' }}>
            <div className="panel live-stat-card">
              <span>Pose Status</span>
              <strong style={{ color: statusColor }}>{sessionActive ? poseStatus : '—'}</strong>
            </div>
            <div className="panel live-stat-card">
              <span>Accuracy Score</span>
              <strong>{sessionActive ? `${poseAccuracy}/100` : '—'}</strong>
            </div>
            <div className="panel live-stat-card">
              <span>Keypoints</span>
              <strong>{keypoints.length}/17</strong>
            </div>
            <div className="panel live-stat-card live-feedback-card">
              <span>Live Feedback</span>
              <ul id="feedbackList">{feedbackList.map((f,i) => <li key={i}>{f}</li>)}</ul>
            </div>
          </div>

          {/* Support Row */}
          <div className="panel live-support-row">
            <div className="analysis-row session-summary-row">
              <span>Session Summary</span>
              <div className="session-summary-text">
                {sessionSummary
                  ? `${sessionSummary.asana} — Avg: ${sessionSummary.avgScore}/100, Angle Err: ${sessionSummary.avgAngleError}°, Frames: ${sessionSummary.totalFrames}`
                  : 'No session completed yet.'}
              </div>
            </div>
            <div className="analysis-row session-summary-row">
              <span>Live Coach</span>
              <div className="session-summary-text">
                {sessionActive
                  ? feedbackList[0] || 'Keep your posture steady and breathe deeply.'
                  : 'Start a session to get real-time posture cues.'}
              </div>
            </div>
            <div className="webcam-report-actions">
              <button onClick={generateReport} disabled={!sessionSummary}>Open Report</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT VIEW ──────────────────────────────────── */}
      {view === 'report' && (
        <>
          <header className="header">
            <div className="header-top">
              <div className="header-brand">
                <img src="/logo.png" alt="YogMitra" className="dashboard-logo" />
                <h1>Mental Yoga — Session Report</h1>
              </div>
              <div className="live-practice-header-actions">
                <button className="secondary-nav-btn" onClick={() => setView('livePractice')}>Back to Live Practice</button>
                <button className="secondary-nav-btn" onClick={() => setView('dashboard')}>Back to Dashboard</button>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
            <p className="status-text">Review your AI-generated mental wellness yoga report.</p>
          </header>

          <div className="report-only-grid">
            <section className="panel live-left-panel">
              <div className="webcam-report-actions">
                <button onClick={downloadReport} disabled={!reportText}>Download Report</button>
                <button className="secondary-nav-btn" onClick={() => setChatOpen(!chatOpen)}>
                  {chatOpen ? 'Hide Assistant' : 'Open Assistant'}
                </button>
              </div>

              {reportLoading && (
                <div className="report-loading">
                  <div className="report-loading-spinner" />
                  <p id="reportLoadingText">Generating your personalized mental wellness report…</p>
                </div>
              )}

              <div className="report-box">
                <div className="report-title-row">
                  <h2>AI Mental Wellness Report</h2>
                  <span className="report-source-badge">{reportText ? 'Report Ready' : 'Awaiting Report'}</span>
                </div>
                <div className="report-output" style={{ whiteSpace:'pre-wrap', lineHeight:'1.75', color:'#c4d6e6', fontSize:'0.9rem' }}>
                  {reportText || 'No report generated yet. End a session and click Generate Report.'}
                </div>
              </div>
            </section>
          </div>

          {/* Chatbot Panel */}
          <button id="reportAssistantToggle" className={`report-assistant-toggle ${chatOpen ? '' : 'hidden'}`} onClick={() => setChatOpen(!chatOpen)}>Assistant</button>
          <div className={`report-assistant-panel ${chatOpen ? '' : 'hidden'}`}>
            <div className="chatbot-box">
              <div className="chatbot-head">
                <h2>Mental Wellness Assistant</h2>
                <p>Ask about your report, pose corrections, and mindfulness tips.</p>
              </div>
              <div className="chatbot-messages">
                {chatMessages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'}>{m.text}</div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form className="chatbot-form" onSubmit={sendChat}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about your session or mental wellness…" maxLength={500} required />
                <button disabled={chatSending}>{chatSending ? '…' : 'Send'}</button>
              </form>
              <button className="secondary-nav-btn" onClick={() => setChatOpen(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
