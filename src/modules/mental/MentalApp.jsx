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
    ],
    anatomicalFocus: {
      targetMuscles: '<ul><li><b>Spinal extensors</b> – maintain upright posture</li><li><b>Core muscles</b> – stabilize the trunk</li><li><b>Leg muscles (Quadriceps & Calves)</b> – provide a strong base</li><li><b>Shoulder retractors</b> – keep the chest open and breathing deep</li></ul>',
      healthBenefits: '<ul><li>Improves overall body posture and alignment</li><li>Increases awareness of breathing patterns</li><li>Builds physical and mental stability</li><li>Relieves stress by slowing down and grounding</li><li>Strengthens the legs and abdomen</li></ul>',
      precautions: '<ul><li>Avoid locking your knees</li><li>If you feel dizzy, widen your foot stance or practice near a wall</li><li>Keep your gaze steady at a single point (Drishti)</li><li>Ensure weight is distributed evenly across both feet</li></ul>',
    },
    photoLinks: [
      '/src/assets/mental/tadasana-step1.png',
      '/src/assets/mental/tadasana-step2.png',
      '/src/assets/mental/tadasana-step3.png',
    ],
    videoLinks: ['/src/assets/mental/tadasana-video.mp4'],
    tutorialCaption: 'Follow this guided Tadasana demo video for mental clarity.',
    tutorialSteps: [
      { title: 'Step 1', caption: 'Stand with feet together or slightly apart, arms by your side.', videoUrl: '/src/assets/mental/tadasana-video.mp4' },
      { title: 'Step 2', caption: 'Interlace fingers, turn palms out, and raise arms straight overhead.', videoUrl: '/src/assets/mental/tadasana-video.mp4' },
      { title: 'Step 3', caption: 'Lengthen through the spine, lifting through the crown of the head.', videoUrl: '/src/assets/mental/tadasana-video.mp4' },
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
    ],
    anatomicalFocus: {
      targetMuscles: '<ul><li><b>Obliques</b> – stretched and strengthened during side bend</li><li><b>Intercostal muscles</b> – improves lung capacity and breathing</li><li><b>Core & Spine</b> – essential for stability and flexibility</li></ul>',
      healthBenefits: '<ul><li>Reduces fatigue and tension in the side body</li><li>Balances the nervous system</li><li>Stimulates abdominal organs</li></ul>',
      precautions: '<ul><li>Avoid if you have acute back pain</li><li>Do not bend forward or backward, only sideways</li></ul>',
    },
    photoLinks: [
      '/src/assets/mental/konasana-step1.png',
      '/src/assets/mental/konasana-step2.png',
      '/src/assets/mental/konasana-step3.png',
    ],
    videoLinks: ['/src/assets/mental/konasana-video.mp4'],
    tutorialCaption: 'Deepen your lateral stretch with this Konasana tutorial.',
    tutorialSteps: [
      { title: 'Step 1', caption: 'Stand tall and raise one arm overhead.', videoUrl: '/src/assets/mental/konasana-video.mp4' },
      { title: 'Step 2', caption: 'Slide the other hand down your leg as you bend sideways.', videoUrl: '/src/assets/mental/konasana-video.mp4' },
      { title: 'Step 3', caption: 'Hold and breathe into the side ribs, then return.', videoUrl: '/src/assets/mental/konasana-video.mp4' },
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
      { q: 'How wide should my stance be?', a: 'Roughly 3–4 feet apart, with your front foot pointing forward.' },
      { q: 'Can Trikonasana help with anxiety?', a: 'Yes. The lateral extension and deep breathing activate the parasympathetic nervous system.' },
    ],
    anatomicalFocus: {
      targetMuscles: '<ul><li><b>Hamstrings & Hips</b> – deep opening and strengthening</li><li><b>Shoulders & Chest</b> – expanded for better respiration</li><li><b>Lower Back</b> – lengthened and released</li></ul>',
      healthBenefits: '<ul><li>Relieves stress and improves psychological endurance</li><li>Increases focus and concentration</li><li>Boosts energy levels</li></ul>',
      precautions: '<ul><li>Keep your legs straight but not hyper-extended</li><li>Look down if neck pain occurs</li></ul>',
    },
    photoLinks: [
      '/src/assets/mental/trikonasana-step1.png',
      '/src/assets/mental/trikonasana-step2.png',
      '/src/assets/mental/trikonasana-step3.png',
    ],
    videoLinks: ['/src/assets/mental/trikonasana-video.mp4'],
    tutorialCaption: 'Master the geometric precision of Triangle Pose.',
    tutorialSteps: [
      { title: 'Step 1', caption: 'Extend arms horizontally and step feet wide.', videoUrl: '/src/assets/mental/trikonasana-video.mp4' },
      { title: 'Step 2', caption: 'Reach down toward your shin while keeping the chest open.', videoUrl: '/src/assets/mental/trikonasana-video.mp4' },
      { title: 'Step 3', caption: 'Extend the top arm toward the sky and breathe.', videoUrl: '/src/assets/mental/trikonasana-video.mp4' },
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
  const [tutorialMode, setTutorialMode] = useState('pose'); // 'pose' | 'video'
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

          <div className="dashboard-grid">
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
                <h3>Anatomical Focus</h3>
                <div className="focus-container">
                  <div className="focus-row">
                    <strong>Target Muscles:</strong> <span dangerouslySetInnerHTML={{ __html: currentAsana.anatomicalFocus.targetMuscles }} />
                  </div>
                  <div className="focus-row">
                    <strong>Benefits:</strong> <span dangerouslySetInnerHTML={{ __html: currentAsana.anatomicalFocus.healthBenefits }} />
                  </div>
                  <div className="focus-row">
                    <strong>Precautions:</strong> <span dangerouslySetInnerHTML={{ __html: currentAsana.anatomicalFocus.precautions }} />
                  </div>
                </div>
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
              {/* Instructor Tutorial (matches sedentary) */}
              <div className="tutorial-wrap">
                <div className="section-head">
                  <h2>Instructor Tutorial</h2>
                  <div className="tutorial-toggle">
                    <button 
                      className="tutorial-toggle-btn" 
                      onClick={() => setTutorialMode(tutorialMode === 'pose' ? 'video' : 'pose')}
                    >
                      {tutorialMode === 'pose' ? 'Show Video' : 'Show Pose'}
                    </button>
                  </div>
                </div>
                <div className="tutorial-media-container">
                  {tutorialMode === 'pose' ? (
                    <div className="tutorial-pose-gallery">
                      {currentAsana.photoLinks.map((src, idx) => (
                        <div key={idx} className="tutorial-pose-item" style={{ flexDirection:'column', gap:'8px' }}>
                          <img src={src} alt={`Step ${idx + 1}`} style={{ borderRadius:'8px', width:'100%', height:'auto', objectFit:'cover' }} />
                          <p style={{ margin:0, fontWeight:'bold', color:'white', textAlign:'center', fontSize:'0.9rem' }}>Step {idx + 1}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <video src={currentAsana.videoLinks[0]} controls playsInline style={{ width:'100%', borderRadius:'12px', background:'#000' }} />
                  )}
                </div>
                <p style={{ marginTop:'12px', fontSize:'0.9rem', color:'var(--muted)' }}>{currentAsana.tutorialCaption}</p>
              </div>

              <div className="info-box live-practice-link-box">
                <h3>🧘 Live Practice</h3>
                <p>Open the live practice page to start real-time pose detection with webcam tracking, angle feedback, and session analysis for mental wellness yoga.</p>
                <button className="open-live-practice-btn" onClick={() => setView('livePractice')}>Open Live Practice</button>
              </div>

              {/* User Stats (Expanded to match sedentary) */}
              <div className="info-box user-stats-box">
                <h3><span role="img" aria-label="stats">📊</span> User Stats & Mental Progress</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Practice Time</div>
                    <div className="stat-value">45 mins</div>
                    <div className="stat-subtext">this week</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Sessions</div>
                    <div className="stat-value">8</div>
                    <div className="stat-subtext">completed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Avg. Mindfulness</div>
                    <div className="stat-value">92%</div>
                    <div className="stat-subtext">posture accuracy</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Mood Score</div>
                    <div className="stat-value">Stable</div>
                    <div className="stat-subtext">post-session avg</div>
                  </div>
                </div>
                
                {sessionSummary && (
                  <div style={{ marginTop:'16px', padding:'14px', background:'rgba(54,244,163,0.06)', borderRadius:'14px', border:'1px solid rgba(54,244,163,0.2)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <h4 style={{ margin:0, color:'var(--accent)', fontSize:'1rem' }}>Last Session Analysis</h4>
                      <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>{sessionSummary.asana}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'0.88rem' }}>
                      <div>
                        <p style={{ margin:'0 0 4px', color:'var(--muted)' }}>Accuracy</p>
                        <p style={{ margin:0, fontWeight:700, color:'var(--text)' }}>{sessionSummary.avgScore}%</p>
                      </div>
                      <div>
                        <p style={{ margin:'0 0 4px', color:'var(--muted)' }}>Precision</p>
                        <p style={{ margin:0, fontWeight:700, color:'var(--text)' }}>±{sessionSummary.avgAngleError}°</p>
                      </div>
                    </div>
                    <button style={{ marginTop:'12px', width:'100%', padding:'10px' }} onClick={generateReport}>Open Full Report</button>
                  </div>
                )}
              </div>

              {/* Enhanced Chatbot panel */}
              <div className="info-box" style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'1.2rem' }}>💬</span>
                    <h3 style={{ margin:0 }}>Wellness & Pose Assistant</h3>
                  </div>
                  <button className="secondary-nav-btn" onClick={() => setChatOpen(!chatOpen)} style={{ padding:'6px 14px', fontSize:'0.85rem', borderRadius:'8px' }}>
                    {chatOpen ? 'Minimize' : 'Chat Now'}
                  </button>
                </div>
                {chatOpen && (
                  <div style={{ background:'rgba(5,16,27,0.4)', borderRadius:'12px', padding:'12px', border:'1px solid var(--stroke)' }}>
                    <div style={{ height:'220px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px', padding:'4px', marginBottom:'12px', scrollbarWidth:'thin' }}>
                      {chatMessages.map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'} style={{ fontSize:'0.88rem' }}>
                          {m.text}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendChat} style={{ display:'flex', gap:'8px' }}>
                      <input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        placeholder="Ask about poses, stress, or your progress..." 
                        style={{ flex:1, padding:'10px 14px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--stroke)', color:'var(--text)' }} 
                      />
                      <button type="submit" disabled={chatSending} style={{ padding:'10px 18px', borderRadius:'10px', background:'var(--accent)', color:'#03101c', fontWeight:700 }}>
                        {chatSending ? '...' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}
                {!chatOpen && <p style={{ margin:0, fontSize:'0.85rem', color:'var(--muted)' }}>Ask me how {selectedAsana} can help reduce stress or how to improve your balance.</p>}
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
        <main className="dashboard report-view" style={{ minHeight:'100vh', padding:'12px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <header className="header">
            <div className="header-top">
              <div className="header-brand">
                <img src="/logo.png" alt="YogMitra" className="dashboard-logo" />
                <h1>Mental Yoga — Session Report</h1>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button className="secondary-nav-btn" onClick={() => setView('livePractice')}>Back to Practice</button>
                <button className="secondary-nav-btn" onClick={() => setView('dashboard')}>Dashboard</button>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
            <p className="status-text" style={{ color:'var(--muted)' }}>Review your detailed posture analysis and mental wellness recommendations.</p>
          </header>

          <div className="dashboard-grid" style={{ gridTemplateColumns:'1fr' }}>
            <section className="panel" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button className="open-live-practice-btn" style={{ padding:'10px 20px' }} onClick={downloadReport}>
                    <span role="img" aria-label="download">📥</span> Download PDF Report
                  </button>
                  <button className="secondary-nav-btn" style={{ padding:'10px 20px' }} onClick={() => setChatOpen(!chatOpen)}>
                    {chatOpen ? 'Close Assistant' : '💬 Ask AI Assistant'}
                  </button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>Analysis Source:</span>
                  <span className="report-source-badge" style={{ margin:0 }}>{reportLoading ? 'Analyzing...' : 'OpenRouter AI'}</span>
                </div>
              </div>

              {reportLoading ? (
                <div style={{ padding:'60px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'20px' }}>
                  <div className="report-loading-spinner" style={{ width:'48px', height:'48px', border:'4px solid var(--stroke)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'report-spin 1s linear infinite' }} />
                  <p style={{ color:'var(--muted)', fontSize:'1.1rem' }}>Our AI is generating your personalized mental wellness report...</p>
                  <style>{`@keyframes report-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div className="report-box" style={{ background:'rgba(5,16,27,0.7)', padding:'32px', borderRadius:'18px', border:'1px solid var(--stroke)', boxShadow:'0 10px 40px rgba(0,0,0,0.3)' }}>
                  <div id="reportOutput" className="report-output" style={{ fontSize:'1rem', lineHeight:'1.8', color:'#d1e2f0' }}>
                    {reportText ? (
                      <div dangerouslySetInnerHTML={{ __html: reportText.replace(/\n/g, '<br/>').replace(/## (.*)/g, '<h3 class="report-section-title" style="color:var(--accent);margin-top:24px;margin-bottom:12px;border-left:4px solid var(--accent);padding-left:12px;">$1</h3>').replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text);">$1</strong>') }} />
                    ) : (
                      <p style={{ textAlign:'center', color:'var(--muted)', padding:'40px' }}>No report data available. Please complete a practice session first.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Visuals Section (matches sedentary) */}
              <div className="info-box" style={{ marginTop:'10px' }}>
                <h3 style={{ marginBottom:'16px' }}>Session Visuals & Key Frames</h3>
                <div id="reportVisuals" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' }}>
                  {/* If we had session captures, they would go here */}
                  <div style={{ background:'rgba(156,197,220,0.05)', height:'200px', borderRadius:'12px', border:'1px dashed var(--stroke)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'0.85rem' }}>
                    Visual frame capture 1
                  </div>
                  <div style={{ background:'rgba(156,197,220,0.05)', height:'200px', borderRadius:'12px', border:'1px dashed var(--stroke)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'0.85rem' }}>
                    Visual frame capture 2
                  </div>
                  <div style={{ background:'rgba(156,197,220,0.05)', height:'200px', borderRadius:'12px', border:'1px dashed var(--stroke)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'0.85rem' }}>
                    Visual frame capture 3
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Chatbot Overlay (for report view) */}
          {chatOpen && (
            <div className="report-assistant-panel" style={{ position:'fixed', bottom:'80px', right:'24px', width:'380px', zIndex:100, background:'linear-gradient(170deg, rgba(14,38,62,0.98), rgba(7,19,33,0.99))', border:'1px solid var(--stroke)', borderRadius:'20px', boxShadow:'0 20px 60px rgba(0,0,0,0.6)', overflow:'hidden' }}>
              <div className="chatbot-box" style={{ padding:'20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <h2 style={{ fontSize:'1.1rem', margin:0 }}>Report Assistant</h2>
                  <button className="secondary-nav-btn" style={{ padding:'4px 10px', fontSize:'0.75rem' }} onClick={() => setChatOpen(false)}>Close</button>
                </div>
                <div style={{ height:'280px', overflowY:'auto', marginBottom:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'} style={{ fontSize:'0.85rem' }}>{m.text}</div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="chatbot-form" onSubmit={sendChat} style={{ display:'flex', gap:'8px' }}>
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    placeholder="Ask about your report..." 
                    style={{ flex:1, padding:'8px 12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)', border:'1px solid var(--stroke)', color:'var(--text)', fontSize:'0.85rem' }} 
                  />
                  <button type="submit" disabled={chatSending} style={{ padding:'8px 16px', borderRadius:'10px', background:'var(--accent)', color:'#03101c', fontWeight:700, fontSize:'0.85rem' }}>
                    {chatSending ? '...' : 'Ask'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
