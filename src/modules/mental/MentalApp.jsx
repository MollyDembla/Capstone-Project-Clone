import React, { useState, useEffect, useRef } from 'react';

// ── Ideal joint angles per pose & step
// Order: [left_elbow, right_elbow, left_shoulder, right_shoulder,
//         left_knee,  right_knee,  hip,           spine]
const IDEAL_POSES = {
  Tadasana:   [170, 170,  90,  90, 170, 170, 170, 180],
  Konasana:   [140, 140, 110, 110, 170, 170, 165, 160],
  // Trikonasana uses 3 progressive steps — use step3 (full pose) for live scoring
  Trikonasana:[170, 170,  90,  90, 170, 170,  90, 120],
};

// Per-step ideal angles for Trikonasana (used in timing & detailed scoring)
const TRIKONASANA_STEP_ANGLES = {
  step1: [170, 170, 90, 90, 170, 170, 90, 165], // Wide stance, T-arms
  step2: [170, 170, 90, 90, 170, 170, 90, 145], // Reaching / lateral bend
  step3: [170, 170, 90, 90, 170, 170, 90, 120], // Full triangle hold
};

// Ideal hold timings (ms from session start anchor)
const TRIKONASANA_IDEAL_TIMINGS = {
  step1Time: 0,
  step2Time: 5000,
  step3Time: 12000,
};

const ANGLE_FEEDBACK = [
  'Straighten your left elbow — keep the arm fully extended.',
  'Straighten your right elbow — reach toward the sky or floor.',
  'Open your left shoulder — align it over the right shoulder.',
  'Open your right shoulder — stack it directly below the left.',
  'Keep your left leg straight — engage the quadriceps.',
  'Keep your right leg straight — do not bend the front knee.',
  'Widen your hip stance — feet should be 3–4 feet apart.',
  'Deepen the lateral tilt — reach further toward your shin/ankle.',
];

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
      '/assets/yoga-poses/pose-neutral.png',
      '/assets/yoga-poses/pose-arms-raised.png',
      '/assets/yoga-poses/pose-stretch.png',
    ],
    videoLinks: ['/assets/videos/tadasana-video.mp4'],
    tutorialCaption: 'Follow this guided Tadasana demo video for mental clarity.',
    tutorialSteps: [
      { title: 'Step 1', caption: 'Stand with feet together or slightly apart, arms by your side.', videoUrl: '/assets/videos/tadasana-video.mp4' },
      { title: 'Step 2', caption: 'Interlace fingers, turn palms out, and raise arms straight overhead.', videoUrl: '/assets/videos/tadasana-video.mp4' },
      { title: 'Step 3', caption: 'Lengthen through the spine, lifting through the crown of the head.', videoUrl: '/assets/videos/tadasana-video.mp4' },
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
      '/assets/yoga-poses/pose-neutral.png',
      '/assets/yoga-poses/pose-arms-raised.png',
      '/assets/yoga-poses/pose-stretch.png',
    ],
    videoLinks: ['/assets/videos/tadasana-video.mp4'],
    tutorialCaption: 'Deepen your lateral stretch with this Konasana tutorial.',
    tutorialSteps: [
      { title: 'Step 1', caption: 'Stand tall and raise one arm overhead.', videoUrl: '/assets/videos/tadasana-video.mp4' },
      { title: 'Step 2', caption: 'Slide the other hand down your leg as you bend sideways.', videoUrl: '/assets/videos/tadasana-video.mp4' },
      { title: 'Step 3', caption: 'Hold and breathe into the side ribs, then return.', videoUrl: '/assets/videos/tadasana-video.mp4' },
    ],
  },
  Trikonasana: {
    description: 'Trikonasana (Triangle Pose) is the primary pose for this mental wellness module. It improves lateral flexibility, opens the hips, hamstrings, and shoulders, and deeply stimulates mental clarity while relieving emotional blockages through controlled lateral extension and breath.',
    focus: [
      'Stimulates mental clarity, focus, and problem-solving ability',
      'Relieves mental fatigue, anxiety, and emotional blockages',
      'Activates the parasympathetic nervous system — calms stress',
      'Enhances creativity, vitality, and mind-body awareness',
    ],
    faqs: [
      { q: 'How wide should my stance be in Trikonasana?', a: 'Set your feet roughly 3–4 feet apart. The front foot points forward and the back foot turns out about 45–60°. A wider stance increases the stretch intensity.' },
      { q: 'Can Trikonasana help with anxiety and stress?', a: 'Yes. The lateral extension, deep breathing, and grounded stance activate the parasympathetic nervous system, reducing cortisol and promoting calm focus.' },
      { q: 'What are the 3 steps of Trikonasana?', a: 'Step 1 — Wide stance with arms extended horizontally (T-shape). Step 2 — Begin the lateral bend, reaching your hand toward the shin. Step 3 — Full triangle with one hand near the ankle and the top arm pointing to the sky.' },
      { q: 'Should I look up, forward or down?', a: 'In the full pose (Step 3), gaze upward toward the raised hand. If you have neck issues, look forward or slightly downward instead.' },
    ],
    anatomicalFocus: {
      targetMuscles: '<ul><li><b>Hamstrings & IT Band</b> – deep lateral lengthening</li><li><b>Hip Abductors & Groins</b> – opened by the wide stance</li><li><b>Obliques & Intercostals</b> – stretched through lateral flexion</li><li><b>Shoulders & Chest</b> – expanded for fuller respiration</li><li><b>Lower Back Extensors</b> – lengthened and decompressed</li></ul>',
      healthBenefits: '<ul><li>Reduces cortisol — alleviates chronic stress and anxiety</li><li>Increases concentration and mental sharpness</li><li>Improves spinal flexibility and posture</li><li>Boosts energy levels and emotional resilience</li><li>Stimulates abdominal organs, improving digestion</li></ul>',
      precautions: '<ul><li>Keep both legs straight — avoid hyperextending the knees</li><li>Keep the chest open, not collapsed toward the floor</li><li>Look down or forward if neck discomfort is felt</li><li>Avoid if you have a recent hip or back injury</li></ul>',
    },
    photoLinks: [
      '/assets/yoga-poses/image1.png',
      '/assets/yoga-poses/image2.png',
      '/assets/yoga-poses/image3.png',
    ],
    videoLinks: ['/assets/videos/trikonasana-video.mp4'],
    tutorialCaption: 'Follow the 3-step Trikonasana progression — build the pose gradually for safe, effective mental and physical benefits.',
    tutorialSteps: [
      {
        title: 'Step 1 — Wide Stance & T-Arms',
        caption: 'Stand tall. Step feet 3–4 feet apart. Extend both arms horizontally at shoulder height, palms facing down. Keep legs straight, spine long, and gaze forward. Hold and breathe.',
        videoUrl: '/assets/videos/trikonasana-video.mp4',
        imageUrl: '/assets/yoga-poses/image1.png'
      },
      {
        title: 'Step 2 — Lateral Bend & Reach',
        caption: 'Inhale. On exhale, hinge at the right hip and reach your right hand toward your right shin. Keep the chest open — do not collapse forward. Raise the left arm skyward. Continue breathing steadily.',
        videoUrl: '/assets/videos/trikonasana-video.mp4',
        imageUrl: '/assets/yoga-poses/image2.png'
      },
      {
        title: 'Step 3 — Full Triangle Hold',
        caption: 'Deepen the bend — lower your right hand to the ankle or floor beside it. Stack the left shoulder directly above the right. Extend the top arm fully to the sky and gaze upward. Hold for 5–8 deep breaths.',
        videoUrl: '/assets/videos/trikonasana-video.mp4',
        imageUrl: '/assets/yoga-poses/image3.png'
      },
    ],
  },
};

// ── Utility: calculate approximate joint angles from MoveNet keypoints
function angleBetween(a, b, c) {
  if (!a || !b || !c) return 0;
  // Check confidence scores - skip low confidence points
  if ((a.score ?? 1) < 0.3 || (b.score ?? 1) < 0.3 || (c.score ?? 1) < 0.3) return 0;
  
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  
  // Avoid division by zero
  if (magAB < 0.01 || magCB < 0.01) return 0;
  
  const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  const angleRad = Math.acos(cosTheta);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  // Return valid angle (0-180)
  return Math.min(180, Math.max(0, angleDeg));
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
  const [selectedAsana, setSelectedAsana] = useState('Trikonasana');
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
  const sessionStartTimeRef = useRef(null);

  // Report state
  const [reportText, setReportText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const captureIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  // User profile state
  const [userProfile, setUserProfile] = useState({
    weight: localStorage.getItem('userWeight') || 70,
    age: localStorage.getItem('userAge') || 30,
    fitnessLevel: localStorage.getItem('userFitnessLevel') || 'moderate',
    healthConditions: localStorage.getItem('userHealthConditions') || '',
  });

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role:'bot', text:'Hi! Ask me anything about your session, pose corrections, or mental wellness yoga.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [tutorialMode, setTutorialMode] = useState('pose'); // 'pose' | 'video'
  const [imageErrors, setImageErrors] = useState({});
  const chatEndRef = useRef(null);
  const rawVideoRef = useRef(null);

  const currentAsana = ASANA_CATALOG[selectedAsana];

  function handleMentalBack() {
    if (view === 'report') {
      setView('livePractice');
      return;
    }

    if (view === 'livePractice') {
      setView('dashboard');
      return;
    }

    window.location.href = '/';
  }

  function handleImageError(idx) {
    setImageErrors(prev => ({ ...prev, [idx]: true }));
  }

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!sessionActive) return;
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: false 
        });
        if (rawVideoRef.current) {
          rawVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
      }
    };

    startCamera();
    return () => {
      console.log('useEffect cleanup: Stopping camera');
      const video = rawVideoRef.current;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
        });
        video.srcObject = null;
        video.pause();
        video.src = '';
      }
      console.log('useEffect cleanup: Camera stopped');
    };
  }, [sessionActive]);

  // Auto-generate report when session summary is created
  useEffect(() => {
    if (sessionSummary && !reportLoading && view === 'livePractice') {
      // Generate report immediately when summary is ready
      generateReportNow(sessionSummary);
    }
  }, [sessionSummary]);

  // ── Keypoints handler ──────────────────────────────────────────
  function handleKeypoints(newKps) {
    setKeypoints(newKps);
    if (!sessionActive || !newKps || newKps.length < 17) return;

    // Filter keypoints with minimum confidence
    const confidentKps = newKps.filter(k => (k.score || 0) > 0.25);
    if (confidentKps.length < 10) return; // Need at least 10 confident keypoints

    // Calculate average confidence from all keypoints
    const avgConf = newKps.reduce((s, k) => s + (k.score || 0), 0) / newKps.length;
    detStatsRef.current = {
      totalDetections: detStatsRef.current.totalDetections + 1,
      avgConf: detStatsRef.current.avgConf + avgConf,
    };

    // Extract angles and compare with ideal
    const userAngles = extractAngles(newKps);

    // For Trikonasana: detect current step from spine tilt (angle index 7)
    // and select the matching ideal angles to provide step-aware feedback
    let idealAngles = IDEAL_POSES[selectedAsana] || IDEAL_POSES.Trikonasana;
    if (selectedAsana === 'Trikonasana') {
      const spineAngle = userAngles[7] || 165; // spine/lateral-tilt angle
      if (spineAngle >= 155) {
        idealAngles = TRIKONASANA_STEP_ANGLES.step1;
      } else if (spineAngle >= 130) {
        idealAngles = TRIKONASANA_STEP_ANGLES.step2;
      } else {
        idealAngles = TRIKONASANA_STEP_ANGLES.step3;
      }
    }

    // Filter out zero angles (which indicate low confidence keypoints)
    const validAngles = userAngles.map((a, i) => a > 0 ? a : null);
    const errors = validAngles.map((a, i) => a !== null ? Math.abs(a - idealAngles[i]) : 0);
    const avgError = errors.length > 0 ? errors.reduce((s, e) => s + e, 0) / errors.filter(e => e > 0).length : 0;

    // Generate feedback based on significant deviations
    const fb = [];
    const FEEDBACK_THRESHOLD = 15; // degrees - more lenient
    
    errors.forEach((e, i) => { 
      if (e > FEEDBACK_THRESHOLD && validAngles[i] !== null) {
        fb.push(ANGLE_FEEDBACK[i]);
      }
    });
    
    if (fb.length === 0) {
      fb.push('✓ Perfect alignment! Hold steady and breathe.');
    }
    setFeedbackList(fb);

    // Calculate accuracy score: angle-based (80%) + stability-based (20%)
    // Improved scoring: 0-10 deg = 90-100%, 10-20 deg = 75-90%, >20 deg = gradual drop
    const errorPenalty = avgError <= 10 ? (avgError / 10) * 10 
                       : avgError <= 20 ? 10 + ((avgError - 10) / 10) * 15
                       : 25 + ((avgError - 20) / 30) * 75;
    
    const angleAcc = Math.max(0, 100 - errorPenalty);
    const stabilityScore = Math.min(avgConf * 100, 100);
    const score = Math.max(0, Math.min(100, angleAcc * 0.8 + stabilityScore * 0.2));
    
    setPoseAccuracy(score.toFixed(1));
    // Correct status at 75+ (Neutral), 85+ (Correct)
    setPoseStatus(score >= 85 ? 'CORRECT' : score >= 65 ? 'NEUTRAL' : 'INCORRECT');

    // Track overall metrics
    const m = metricsRef.current;
    
    // Track step-specific metrics
    let stepKey = 'step1';
    if (selectedAsana === 'Trikonasana') {
      const spineAngle = userAngles[7] || 165;
      if (spineAngle >= 155) stepKey = 'step1';
      else if (spineAngle >= 130) stepKey = 'step2';
      else stepKey = 'step3';
    }
    
    const sm = m.stepMetrics[stepKey];
    if (sm.firstEntry === null) {
      sm.firstEntry = (Date.now() - sessionStartTimeRef.current) / 1000;
    }
    sm.count++;
    sm.sumScore += score;
    sm.sumAngle += avgError;
    if (score >= sm.bestScore) {
      sm.bestScore = score;
      sm.bestKeypoints = newKps;
    }

    const nextCorrections = { ...m.corrections };
    fb.forEach(msg => { nextCorrections[msg] = (nextCorrections[msg] || 0) + 1; });
    
    metricsRef.current = {
      ...m,
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
    sessionStartTimeRef.current = Date.now();
    metricsRef.current = { 
      frameCount:0, 
      scoreSum:0, 
      angleSum:0, 
      bestScore:0, 
      worstScore:100, 
      corrections:{},
      stepMetrics: {
        step1: { firstEntry: null, sumScore: 0, sumAngle: 0, count: 0, bestKeypoints: null, bestScore: 0 },
        step2: { firstEntry: null, sumScore: 0, sumAngle: 0, count: 0, bestKeypoints: null, bestScore: 0 },
        step3: { firstEntry: null, sumScore: 0, sumAngle: 0, count: 0, bestKeypoints: null, bestScore: 0 }
      }
    };
    detStatsRef.current = { totalDetections:0, avgConf:0 };
    setFeedbackList([]);
    setPoseAccuracy(0);
    setPoseStatus('NEUTRAL');
    setSessionSummary(null);
    setReportText('');
    setCapturedFrames([]);
    setSessionActive(true);
    
    // Capture frames every 2 seconds (max 5 frames)
    let frameCount = 0;
    captureIntervalRef.current = setInterval(() => {
      try {
        const canvas = canvasRef.current;
        const video = rawVideoRef.current;
        
        if (!canvas || !video) {
          console.log('Canvas or video ref not available');
          return;
        }
        
        if (!video.srcObject) {
          console.log('Video stream not available yet');
          return;
        }
        
        // Ensure video is ready
        if (video.readyState !== video.HAVE_ENOUGH_DATA && video.readyState !== video.HAVE_FUTURE_DATA) {
          console.log('Video not ready, readyState:', video.readyState);
          return;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        frameCount++;
        console.log(`Frame captured: ${frameCount}`);
        setCapturedFrames(prev => [...prev.slice(-4), imageData]);
      } catch (err) {
        console.log('Frame capture error:', err.message);
      }
    }, 2000);
  }

  function endSession() {
    console.log('endSession called');
    
    // AGGRESSIVE camera shutdown - multiple layers
    console.log('Stopping camera with multiple shutdown methods...');
    const video = rawVideoRef.current;
    if (video) {
      // Method 1: Stop all tracks
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        console.log(`Stopping ${tracks.length} camera tracks`);
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
          console.log(`Stopped: ${track.kind} - ${track.label}`);
        });
        video.srcObject = null;
      }
      
      // Method 2: Pause and clear
      video.pause();
      video.currentTime = 0;
      video.src = '';
      video.removeAttribute('src');
      
      // Method 3: Load empty
      try {
        video.load();
      } catch (e) {
        console.log('Video load error (expected):', e.message);
      }
      
      console.log('✅ Camera fully shut down');
    }
    
    setSessionActive(false);
    
    // Stop frame capture
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    const m = metricsRef.current;
    const fc = Math.max(1, m.frameCount);
    const detectionCount = Math.max(1, detStatsRef.current.totalDetections);
    const sessionDuration = sessionStartTimeRef.current ? Math.round((Date.now() - sessionStartTimeRef.current) / 1000) : 0;
    
    const summary = {
      asana: selectedAsana,
      totalFrames: detectionCount,
      avgScore: parseFloat((m.scoreSum / fc).toFixed(1)),
      avgAngleError: parseFloat((m.angleSum / fc).toFixed(1)),
      bestScore: m.bestScore === 0 ? 0 : parseFloat(m.bestScore.toFixed(1)),
      worstScore: m.worstScore === 100 ? 0 : parseFloat(m.worstScore.toFixed(1)),
      corrections: m.corrections,
      status: poseStatus,
      confidence: parseFloat((detStatsRef.current.avgConf / detectionCount * 100).toFixed(1)),
      sessionDuration: sessionDuration,
      frames: capturedFrames,
      userProfile: userProfile,
      improvementRate: fc > 0 ? Math.min(100, Math.round((m.bestScore - m.worstScore))) : 0,
      stepMetrics: Object.keys(m.stepMetrics).reduce((acc, key) => {
        const sm = m.stepMetrics[key];
        const count = Math.max(1, sm.count);
        acc[key] = {
          userTime: sm.firstEntry || 0,
          idealTime: key === 'step1' ? 0 : key === 'step2' ? 5 : 12,
          avgScore: sm.sumScore / count,
          avgAngle: sm.sumAngle / count,
          bestKeypoints: sm.bestKeypoints
        };
        return acc;
      }, {})
    };
    
    console.log('Session summary:', summary);
    console.log('Frames in summary:', summary.frames);
    console.log('Number of captured frames:', summary.frames?.length || 0);
    setSessionSummary(summary);
    generateReportNow(summary);
  }

  // ── Report ───────────────────────────────────────────────────
  async function generateReportNow(summary) {
    console.log('generateReportNow called - generating INSTANT report');
    if (!summary) {
      console.warn('No summary provided to generateReportNow');
      return;
    }
    
    // Generate local report INSTANTLY (do not wait for API)
    console.log('Generating local report immediately...');
    const reportContent = buildLocalReport(summary);
    setReportText(reportContent);
    setView('report');
    setReportLoading(false);
    console.log('Report displayed instantly');
    
    // Optional: Try API in background (non-blocking) with timeout
    setTimeout(() => {
      try {
        const payload = {
          asana: summary.asana,
          accuracy: parseFloat(summary.avgScore),
          angles: { avgError: parseFloat(summary.avgAngleError), correctionCounts: summary.corrections },
          timing: { framesCaptured: summary.totalFrames, sessionDurationSec: summary.sessionDuration },
          stability: parseFloat(summary.confidence || 0),
        };
        
        fetch('/api/mental/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(res => res.json()).then(data => {
          if (data.report && data.report.length > reportContent.length) {
            console.log('Enhanced AI report available, updating...');
            setReportText(data.report);
          }
        }).catch(err => console.log('API report optional:', err.message));
      } catch (e) {
        console.log('Background API fetch skipped');
      }
    }, 100);
  }

  function generateReport() {
    if (!sessionSummary) return;
    generateReportNow(sessionSummary);
  }

  function buildLocalReport(s) {
    const topCorrections = Object.entries(s.corrections || {})
      .sort((a,b) => b[1]-a[1])
      .slice(0,4)
      .map(([k, cnt]) => `- ${k} (detected ${cnt}× during session)`)
      .join('\n') || '- No specific alignment corrections recorded.';

    const mins = Math.floor((s.sessionDuration || 0) / 60);
    const secs = (s.sessionDuration || 0) % 60;
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // User profile data for personalized recommendations
    const weight = s.userProfile?.weight || 70;
    const age = s.userProfile?.age || 30;
    const fitnessLevel = s.userProfile?.fitnessLevel || 'moderate';
    const weightCategory = weight > 85 ? 'higher body weight' : weight < 50 ? 'lighter frame' : 'average weight';
    const ageCategory = age > 50 ? 'mature practitioner' : age < 25 ? 'young practitioner' : 'mid-age practitioner';
    const holdDuration = weight > 85 ? '15–20 seconds' : age > 50 ? '20–25 seconds' : '30–45 seconds';
    const frequencyAdvice = fitnessLevel === 'beginner' ? '2–3 times per week' : fitnessLevel === 'moderate' ? '4–5 times per week' : '6–7 times per week';
    const depthAdvice = weight > 85 ? 'use a yoga block under the lower hand to ease hamstring strain' : age > 50 ? 'bend only as far as comfortable — prioritise a straight spine over depth' : 'gradually deepen the lateral bend while keeping both legs straight';
    const cardioAdvice = age > 50 ? 'Focus on balance and breath control rather than maximal depth' : 'Gradually increase your hold time to build lateral endurance';

    const avgScore = typeof s.avgScore === 'number' ? s.avgScore : parseFloat(s.avgScore) || 0;
    const avgConf  = typeof s.confidence === 'number' ? s.confidence : parseFloat(s.confidence) || 0;
    const avgErr   = typeof s.avgAngleError === 'number' ? s.avgAngleError : parseFloat(s.avgAngleError) || 0;

    const scoreLevel = avgScore >= 80 ? 'excellent — precise Trikonasana geometry achieved!'
      : avgScore >= 60 ? 'good progress — minor alignment refinements will sharpen your triangle.'
      : 'developing — regular practice of the 3 steps will build the necessary flexibility and balance.';

    const confLevel = avgConf >= 80 ? 'very reliable and consistent throughout the session.'
      : avgConf >= 60 ? 'fairly consistent — keep the full body visible in the frame.'
      : 'variable — ensure good lighting and step back so your full body is visible.';

    return `## Trikonasana (Triangle Pose) — Mental Health Session Report

**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
**Practitioner:** ${userName} | **Age:** ${age} yrs | **Weight:** ${weight} kg
**Fitness Level:** ${fitnessLevel} | **Session Duration:** ${duration}

---

### 1) Session Performance Summary
Your overall Trikonasana performance score was **${avgScore.toFixed(1)} / 100**.
- Pose detection confidence : ${avgConf.toFixed(1)}%
- Average joint-angle error  : ${avgErr.toFixed(1)}°
- Frames analysed            : ${s.totalFrames}
- Best frame score           : ${typeof s.bestScore === 'number' ? s.bestScore.toFixed(1) : s.bestScore}
- Improvement range          : ${s.improvementRate || 0}% across the session

---

### 2) Trikonasana Step-by-Step Technique Breakdown
**Step 1 — Wide Stance & T-Arms** (target: 0 s)
A solid foundation in Step 1 (shoulder-width arm extension, straight legs, upright spine) is the basis for a clean triangle.

**Step 2 — Lateral Bend & Reach** (target: ~5 s)
Smooth lateral hinging without forward/backward collapse is key. The chest must remain open and stacked over the front leg.

**Step 3 — Full Triangle Hold** (target: ~12 s)
Bottom hand near the ankle, top arm vertical, gaze skyward. Hold for 5–8 deep breaths to receive full mental and physical benefit.

---

### 3) Alignment Corrections Detected
${topCorrections}

---

### 4) What Needs Improvement
${avgErr > 20
  ? '- Major joint deviations detected — focus on Step 1 before attempting full depth.'
  : avgErr > 12
    ? '- Moderate deviations — isolate the lateral bend and practise against a wall for guidance.'
    : '- Minor refinements only — focus on breath quality and gaze (drishti) during Step 3 holds.'}
${avgScore < 60 ? '- Practise Step 1 in isolation daily to build the T-arm alignment habit.' : ''}
${avgScore < 80 ? '- Use a yoga block at Step 3 to maintain a straight spine while building hamstring flexibility.' : ''}

---

### 5) Corrective Drills (Step-by-Step)
1. **Wall Triangle Drill (5 min):** Stand with your back heel touching the wall. Extend arms and bend laterally — the wall prevents leaning forward/backward.
2. **Strap-Assisted Reach (5 min):** Loop a strap around your front ankle and hold with the lower hand to deepen the stretch without collapsing the chest.
3. **3-Count Breath Hold (8 min):** At Step 3 depth, inhale 4 counts, hold 4 counts, exhale 6 counts. Repeat × 5 per side to build parasympathetic activation.

---

### 6) Next Session Targets (Personalised for ${ageCategory} / ${weightCategory})
- **Hold Duration:** ${holdDuration} per side at Step 3
- **Practice Frequency:** ${frequencyAdvice}
- **Depth Progression:** ${depthAdvice}
- **Endurance Focus:** ${cardioAdvice}
- **Target Score:** Aim for ≥ ${Math.min(95, Math.round(avgScore + 8))} / 100
- **Target Angle Error:** Reduce to ≤ ${Math.max(8, Math.round(avgErr - 3))}°

---

### Mental Wellness Impact
Regular Trikonasana practice — even ${frequencyAdvice} — significantly reduces cortisol, improves lateral spinal mobility, and trains the nervous system to maintain calm focus under physical challenge. Your score of **${avgScore.toFixed(1)}/100** shows ${scoreLevel}

Detection reliability was ${confLevel}

Keep practicing, ${userName}! Each session deepens the triangle. 🙏`;
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
      <button
        type="button"
        className="fixed-back-btn"
        onClick={handleMentalBack}
        aria-label="Go back"
        title="Back"
      >
        ←
      </button>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} width={640} height={480} style={{ display:'none' }} />

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
                          {imageErrors[idx] ? (
                            <div style={{
                              width:'100%',
                              height:'200px',
                              background:'rgba(54, 244, 163, 0.1)',
                              border:'2px dashed rgba(54, 244, 163, 0.4)',
                              borderRadius:'8px',
                              display:'flex',
                              flexDirection:'column',
                              alignItems:'center',
                              justifyContent:'center',
                              padding:'16px',
                              textAlign:'center'
                            }}>
                              <div style={{ fontSize:'2rem', marginBottom:'8px' }}>📸</div>
                              <p style={{ margin:0, color:'#36f4a3', fontSize:'0.85rem', fontWeight:600 }}>Image Not Found</p>
                              <p style={{ margin:'4px 0 0 0', color:'#a8c0d4', fontSize:'0.75rem' }}>Add {src.split('/').pop()} to public/assets/yoga-poses/</p>
                            </div>
                          ) : (
                            <img 
                              src={src} 
                              alt={`Step ${idx + 1}`}
                              onError={() => handleImageError(idx)}
                              style={{ borderRadius:'6px', width:'100%', height:'100%', objectFit:'contain', display:'block' }} 
                            />
                          )}
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
            </section>
          </div>
        </>
      )}

      {/* ── LIVE PRACTICE VIEW ───────────────────────────── */}
      {view === 'livePractice' && (
        <main className="dashboard live-practice-view" style={{ padding:'12px', display:'flex', flexDirection:'column', gap:'12px' }}>
          {/* Header */}
          <header className="header" style={{ marginBottom:'0' }}>
            <div className="header-top">
              <div className="header-brand">
                <img src="/logo.png" alt="YogMitra" className="dashboard-logo" style={{ width:'32px', height:'32px' }} />
                <h1 style={{ fontSize:'1.1rem', margin:0 }}>Live Practice — {selectedAsana}</h1>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
            <p className="status-text" style={{ color:'var(--muted)', fontSize:'0.9rem', margin:'8px 0 0' }}>Position your full body: head, both palms, and both feet visible for accurate pose detection.</p>
          </header>

          {/* 3-Column Video Layout */}
          <section className="live-session-layout" style={{ flex:1, display:'grid', gridTemplateRows:'1fr auto auto auto', gap:'10px', minHeight:0 }}>
            <div className="live-top-row" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'10px', minHeight:0 }}>
              {/* LEFT: Instructor/Tutorial */}
              <div className="panel live-screen-card instructor-card" style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h3 style={{ margin:0, fontSize:'0.92rem', color:'#d6e9f9' }}>Instructor Video</h3>
                  <button 
                    className="tutorial-toggle-btn"
                    onClick={() => {
                      const btn = document.querySelector('.tutorial-toggle-btn');
                      const gallery = document.querySelector('.asana-tutorial-gallery-mental');
                      const video = document.querySelector('.asana-video-mental');
                      if (gallery && video) {
                        if (gallery.style.display === 'none') {
                          gallery.style.display = 'block';
                          video.style.display = 'none';
                          btn.textContent = 'Show Video';
                        } else {
                          gallery.style.display = 'none';
                          video.style.display = 'block';
                          btn.textContent = 'Show Pose';
                        }
                      }
                    }}
                    style={{ fontSize:'0.75rem', padding:'4px 10px', background:'var(--button-bg)', color:'var(--text)', border:'1px solid var(--stroke)', borderRadius:'6px', cursor:'pointer' }}
                  >
                    Show Video
                  </button>
                </div>
                <div className="asana-tutorial-gallery-mental" style={{ flex:1, minHeight:0, overflow:'hidden', borderRadius:'10px', background:'#000', display:'grid', gridTemplateColumns:'1fr', alignItems:'center', justifyContent:'center' }}>
                  {currentAsana.photoLinks && currentAsana.photoLinks[0] && (
                    <img src={currentAsana.photoLinks[0]} alt={`${selectedAsana} pose`} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                  )}
                </div>
                <div className="asana-video-mental" style={{ flex:1, minHeight:0, overflow:'hidden', borderRadius:'10px', background:'#000', display:'none' }}>
                  {currentAsana.videoLinks && currentAsana.videoLinks[0] && (
                    <video src={currentAsana.videoLinks[0]} controls style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                  )}
                </div>
              </div>

              {/* MIDDLE: User Raw Video */}
              <div className="panel live-screen-card" style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <h3 style={{ margin:0, fontSize:'0.92rem', color:'#d6e9f9' }}>User (Raw)</h3>
                <div style={{ flex:1, minHeight:0, background:'#000', borderRadius:'10px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:'0.8rem' }}>
                  {sessionActive ? (
                    <video ref={rawVideoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} autoPlay playsInline muted></video>
                  ) : (
                    <div style={{ textAlign:'center' }}>Ready to capture</div>
                  )}
                </div>
              </div>

              {/* RIGHT: User Markers */}
              <div className="panel live-screen-card" style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <h3 style={{ margin:0, fontSize:'0.92rem', color:'#d6e9f9' }}>User (Markers)</h3>
                <div style={{ flex:1, minHeight:0, background:'#000', borderRadius:'10px', overflow:'hidden', position:'relative' }}>
                  {sessionActive ? (
                    <PoseDetectorComponent 
                      onKeypointsUpdate={handleKeypoints} 
                      isActive={true}
                      options={{ 
                        modelType:'lite', 
                        frameSkip:1, 
                        minConfidence:0.45,
                        targetFPS:30, 
                        showDebugInfo:false,
                        showSkeleton:true,
                        hideUI:true,
                      }} 
                    />
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--muted)', fontSize:'0.8rem' }}>
                      Click Start to detect
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session Controls */}
            <div className="live-session-controls-row" style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={startSession} disabled={sessionActive} className="session-control-btn" style={{ minWidth:'140px', padding:'10px 16px' }}>Start Session</button>
              <button onClick={endSession} disabled={!sessionActive} className="session-control-btn" style={{ minWidth:'140px', padding:'10px 16px' }}>End Session</button>
            </div>

            {/* Camera Guide */}
            <p className="camera-guide-text" style={{ textAlign:'center', margin:0, fontSize:'0.85rem', color:'var(--muted)' }}>Keep your full body visible: head, both palms, and both feet.</p>

            {/* Stats Row */}
            <div className="live-stats-row" style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:'10px' }}>
              <div className="panel live-stat-card" style={{ display:'grid', gap:'4px', alignContent:'start', padding:'12px', minHeight:0 }}>
                <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Prediction</span>
                <strong style={{ fontSize:'1rem', color:statusColor }}>{sessionActive ? poseStatus : '—'}</strong>
              </div>
              <div className="panel live-stat-card" style={{ display:'grid', gap:'4px', alignContent:'start', padding:'12px', minHeight:0 }}>
                <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Confidence</span>
                <strong style={{ fontSize:'1rem' }}>{sessionActive ? `${Math.round((keypoints.length/17)*100)}%` : '—'}</strong>
              </div>
              <div className="panel live-stat-card" style={{ display:'grid', gap:'4px', alignContent:'start', padding:'12px', minHeight:0 }}>
                <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Score (0-100)</span>
                <strong style={{ fontSize:'1rem' }}>{sessionActive ? Math.round(poseAccuracy) : '—'}</strong>
              </div>
              <div className="panel live-stat-card live-feedback-card" style={{ display:'grid', gap:'4px', alignContent:'start', padding:'12px', minHeight:0 }}>
                <span style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Feedback</span>
                <ul style={{ margin:0, paddingLeft:'16px', fontSize:'0.75rem', maxHeight:'60px', overflowY:'auto', display:'grid', gap:'2px' }}>
                  {feedbackList.length > 0 ? feedbackList.map((f,i) => <li key={i} style={{ margin:0 }}>{f}</li>) : <li style={{ color:'var(--muted)', margin:0 }}>Waiting for stable pose…</li>}
                </ul>
              </div>
            </div>

            {/* Support Row */}
            <div className="panel live-support-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', padding:'12px', alignItems:'start' }}>
              <div className="analysis-row session-summary-row" style={{ display:'grid', gap:'4px' }}>
                <span style={{ fontSize:'0.85rem', color:'var(--muted)', fontWeight:700 }}>Session Summary</span>
                <div className="session-summary-text" style={{ fontSize:'0.8rem', color:'var(--text)', minHeight:'40px', display:'flex', alignItems:'center' }}>
                  {sessionSummary
                    ? `${sessionSummary.asana} • Avg: ${sessionSummary.avgScore.toFixed(0)}/100 • Frames: ${sessionSummary.totalFrames}`
                    : 'No session completed yet.'}
                </div>
              </div>
              <div className="analysis-row session-summary-row" style={{ display:'grid', gap:'4px' }}>
                <span style={{ fontSize:'0.85rem', color:'var(--muted)', fontWeight:700 }}>Live Coach</span>
                <div className="session-summary-text" style={{ fontSize:'0.8rem', color:'var(--text)', minHeight:'40px', display:'flex', alignItems:'center' }}>
                  {sessionActive
                    ? feedbackList[0] || 'Keep your posture steady and breathe deeply.'
                    : 'Start session to get real-time posture cues.'}
                </div>
              </div>
            </div>
          </section>

          {/* Floating Open Report Button */}
          <button 
            onClick={generateReport} 
            disabled={!sessionSummary}
            className="open-live-practice-btn"
            style={{ 
              position:'fixed', 
              bottom:'24px', 
              right:'24px', 
              padding:'12px 20px', 
              background:sessionSummary ? 'linear-gradient(135deg, #36f4a3, #29a9ff)' : 'var(--button-bg)',
              color:sessionSummary ? '#03101c' : 'var(--text)',
              fontSize:'0.9rem',
              fontWeight:700,
              border:'none',
              borderRadius:'12px',
              cursor:sessionSummary ? 'pointer' : 'not-allowed',
              opacity:sessionSummary ? 1 : 0.5,
              boxShadow: sessionSummary ? '0 8px 24px rgba(54, 244, 163, 0.4)' : 'none',
              zIndex:50
            }}
          >
            Open Report Page
          </button>

          {/* Floating Chat Button */}
          <button 
            className="floating-chat-button"
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: sessionSummary ? '200px' : '24px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #36f4a3, #29a9ff)',
              border: 'none',
              color: '#03101c',
              fontSize: '28px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(54, 244, 163, 0.4)',
              zIndex: 49,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: chatOpen ? 'scale(0.95)' : 'scale(1)',
            }}
            title="Chat with Wellness Assistant"
          >
            {chatOpen ? '✕' : '💬'}
          </button>

          {/* Floating Chat Panel */}
          {chatOpen && (
            <div style={{ position:'fixed', bottom:'100px', right:sessionSummary ? '200px' : '24px', width:'400px', zIndex:48, background:'linear-gradient(170deg, rgba(14,38,62,0.99), rgba(7,19,33,0.99))', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'24px', boxShadow:'0 25px 60px rgba(0,0,0,0.7)', overflow:'hidden', animation:'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'12px', borderBottom:'1px solid rgba(54, 244, 163, 0.15)' }}>
                  <div>
                    <h2 style={{ fontSize:'1.15rem', margin:0, fontWeight:700, color:'#fff' }}>Wellness Assistant</h2>
                    <p style={{ margin:'4px 0 0 0', fontSize:'0.8rem', color:'#7dd8ff' }}>Ask about {selectedAsana}</p>
                  </div>
                </div>
                <div style={{ height:'320px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', paddingRight:'4px' }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'}>{m.text}</div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendChat} style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    placeholder="Ask about your practice..." 
                    style={{ flex:1, padding:'12px 14px', borderRadius:'12px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(54, 244, 163, 0.25)', color:'var(--text)', fontSize:'0.87rem', transition:'all 0.3s' }} 
                  />
                  <button type="submit" disabled={chatSending} style={{ padding:'12px 18px', borderRadius:'12px', background:'linear-gradient(135deg, #36f4a3, #29a9ff)', color:'#03101c', fontWeight:700, fontSize:'0.85rem', cursor: chatSending ? 'not-allowed' : 'pointer', opacity: chatSending ? 0.6 : 1 }}>
                    {chatSending ? '...' : 'Ask'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ── REPORT VIEW ──────────────────────────────────── */}
      {view === 'report' && (
        <main className="dashboard report-view" style={{ minHeight:'100vh', padding:'12px', display:'flex', flexDirection:'column', gap:'16px', background:'var(--bg)', overflow:'auto' }}>
          <header className="header">
            <div className="header-top">
              <div className="header-brand">
                <img src="/logo.png" alt="YogMitra" className="dashboard-logo" />
                <h1>Mental Yoga — Session Report</h1>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button className="secondary-nav-btn" onClick={() => setView('livePractice')}>Back to Practice</button>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
            <p className="status-text" style={{ color:'var(--muted)' }}>Review your detailed posture analysis and mental wellness recommendations.</p>
          </header>

          <div className="dashboard-grid" style={{ display:'grid', gridTemplateColumns:'1fr', gap:'16px', flex:1 }}>
            <section className="panel" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              {/* Session Summary Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'12px' }}>
                <div style={{ background:'rgba(54, 244, 163, 0.08)', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'12px', padding:'16px' }}>
                  <p style={{ margin:'0 0 8px 0', color:'#7dd8ff', fontSize:'0.9rem' }}>Asana</p>
                  <p style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{sessionSummary?.asana || '—'}</p>
                </div>
                <div style={{ background:'rgba(54, 244, 163, 0.08)', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'12px', padding:'16px' }}>
                  <p style={{ margin:'0 0 8px 0', color:'#7dd8ff', fontSize:'0.9rem' }}>Accuracy Score</p>
                  <p style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{sessionSummary?.avgScore?.toFixed(1) || '—'}/100</p>
                </div>
                <div style={{ background:'rgba(54, 244, 163, 0.08)', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'12px', padding:'16px' }}>
                  <p style={{ margin:'0 0 8px 0', color:'#7dd8ff', fontSize:'0.9rem' }}>Angle Error</p>
                  <p style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{sessionSummary?.avgAngleError?.toFixed(1) || '—'}°</p>
                </div>
                <div style={{ background:'rgba(54, 244, 163, 0.08)', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'12px', padding:'16px' }}>
                  <p style={{ margin:'0 0 8px 0', color:'#7dd8ff', fontSize:'0.9rem' }}>Detection Confidence</p>
                  <p style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{sessionSummary?.confidence?.toFixed(1) || '—'}%</p>
                </div>
              </div>

              {/* Report Content - Structured Format */}
              {reportLoading ? (
                <div style={{ padding:'60px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px', minHeight:'300px' }}>
                  <div className="report-loading-spinner" style={{ width:'48px', height:'48px', border:'4px solid var(--stroke)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
                  <p style={{ color:'var(--muted)', fontSize:'1.1rem' }}>Generating your personalized mental wellness report...</p>
                </div>
              ) : sessionSummary ? (
                <div className="report-box" style={{ background:'rgba(5,16,27,0.7)', padding:'32px', borderRadius:'18px', border:'1px solid var(--stroke)', boxShadow:'0 10px 40px rgba(0,0,0,0.3)' }}>
                  {/* User Info Header */}
                  <div style={{ marginBottom:'32px', paddingBottom:'20px', borderBottom:'2px solid rgba(54, 244, 163, 0.2)' }}>
                    <h2 style={{ margin:'0 0 12px 0', color:'var(--accent)', fontSize:'1.4rem' }}>🧘 {sessionSummary.asana} Session Report</h2>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', fontSize:'0.95rem' }}>
                      <div>
                        <p style={{ margin:'0 0 4px 0', color:'#7dd8ff', fontWeight:700 }}>👤 Practitioner</p>
                        <p style={{ margin:0, color:'#d1e2f0' }}>{userName}</p>
                      </div>
                      <div>
                        <p style={{ margin:'0 0 4px 0', color:'#7dd8ff', fontWeight:700 }}>📅 Date & Time</p>
                        <p style={{ margin:0, color:'#d1e2f0' }}>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p style={{ margin:'0 0 4px 0', color:'#7dd8ff', fontWeight:700 }}>⏱️ Duration</p>
                        <p style={{ margin:0, color:'#d1e2f0' }}>{Math.floor(sessionSummary.sessionDuration / 60)}m {sessionSummary.sessionDuration % 60}s</p>
                      </div>
                      <div>
                        <p style={{ margin:'0 0 4px 0', color:'#7dd8ff', fontWeight:700 }}>👤 Profile</p>
                        <p style={{ margin:0, color:'#d1e2f0' }}>Age: {sessionSummary.userProfile?.age}yrs | Weight: {sessionSummary.userProfile?.weight}kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics Table (Restored) */}
                  <div style={{ marginBottom:'32px' }}>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>📊 Performance Summary</h3>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.95rem' }}>
                        <tbody>
                          <tr style={{ borderBottom:'1px solid rgba(54, 244, 163, 0.2)' }}>
                            <td style={{ padding:'12px', color:'#7dd8ff', fontWeight:700 }}>Accuracy Score</td>
                            <td style={{ padding:'12px', color:'#d1e2f0', textAlign:'right', fontSize:'1.1rem', fontWeight:700 }}>{sessionSummary.avgScore?.toFixed(1) || '—'} / 100</td>
                          </tr>
                          <tr style={{ borderBottom:'1px solid rgba(54, 244, 163, 0.2)' }}>
                            <td style={{ padding:'12px', color:'#7dd8ff', fontWeight:700 }}>Confidence Level</td>
                            <td style={{ padding:'12px', color:'#d1e2f0', textAlign:'right', fontSize:'1.1rem', fontWeight:700 }}>{sessionSummary.confidence?.toFixed(1) || '—'}%</td>
                          </tr>
                          <tr style={{ borderBottom:'1px solid rgba(54, 244, 163, 0.2)' }}>
                            <td style={{ padding:'12px', color:'#7dd8ff', fontWeight:700 }}>Avg Angle Error</td>
                            <td style={{ padding:'12px', color:'#d1e2f0', textAlign:'right', fontSize:'1.1rem', fontWeight:700 }}>{sessionSummary.avgAngleError?.toFixed(1) || '—'}°</td>
                          </tr>
                          <tr style={{ borderBottom:'1px solid rgba(54, 244, 163, 0.2)' }}>
                            <td style={{ padding:'12px', color:'#7dd8ff', fontWeight:700 }}>Frames Analyzed</td>
                            <td style={{ padding:'12px', color:'#d1e2f0', textAlign:'right', fontSize:'1.1rem', fontWeight:700 }}>{sessionSummary.totalFrames}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step-wise Technique Breakdown Table */}
                  <div style={{ marginBottom:'32px' }}>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>⏱️ Step-wise Timing & Comparison</h3>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.9rem', color:'#d1e2f0' }}>
                        <thead>
                          <tr style={{ borderBottom:'2px solid rgba(54, 244, 163, 0.3)', textAlign:'left' }}>
                            <th style={{ padding:'12px' }}>Step</th>
                            <th style={{ padding:'12px' }}>Angle vs Ideal</th>
                            <th style={{ padding:'12px' }}>User Time</th>
                            <th style={{ padding:'12px' }}>Ideal Time</th>
                            <th style={{ padding:'12px' }}>Delay</th>
                            <th style={{ padding:'12px' }}>Weighted Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['step1', 'step2', 'step3'].map((key) => {
                            const m = sessionSummary.stepMetrics?.[key] || {};
                            const delay = (m.userTime - m.idealTime).toFixed(2);
                            const angleErr = (m.avgAngle || 0).toFixed(2);
                            const perf = angleErr < 15 ? 'Correct' : angleErr < 25 ? 'Moderate' : 'Incorrect';
                            return (
                              <tr key={key} style={{ borderBottom:'1px solid rgba(54, 244, 163, 0.15)' }}>
                                <td style={{ padding:'12px', fontWeight:700 }}>{key.toUpperCase()}</td>
                                <td style={{ padding:'12px' }}>{angleErr}° ({perf})</td>
                                <td style={{ padding:'12px' }}>{m.userTime?.toFixed(2)}s</td>
                                <td style={{ padding:'12px' }}>{m.idealTime?.toFixed(2)}s</td>
                                <td style={{ padding:'12px', color: parseFloat(delay) > 1 ? '#ff6b6b' : '#36f4a3' }}>{delay}s</td>
                                <td style={{ padding:'12px' }}>{m.avgScore?.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Session Summary */}
                  <div style={{ marginBottom:'32px' }}>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>📝 Session Summary</h3>
                    <p style={{ margin:0, lineHeight:'1.8', color:'#d1e2f0' }}>In today's yoga session, we focused on {sessionSummary.asana}, a foundational pose that promotes stability and mindfulness. The session lasted for {Math.floor(sessionSummary.sessionDuration / 60)}m {sessionSummary.sessionDuration % 60}s, allowing us to connect with our breath and body. While the pose accuracy score was {sessionSummary.avgScore?.toFixed(1)} out of 100, this is a great starting point for continuous improvement. Remember, yoga is a journey, and every session helps us improve and grow.</p>
                  </div>

                  {/* Pose Accuracy Analysis */}
                  <div style={{ marginBottom:'32px' }}>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>🎯 Pose Accuracy Analysis</h3>
                    <p style={{ margin:0, lineHeight:'1.8', color:'#d1e2f0' }}>During the session, we observed an average angle error of {sessionSummary.avgAngleError?.toFixed(1)} degrees, indicating room for improvement in your alignment. The detection stability was at {sessionSummary.confidence?.toFixed(1)}%, suggesting {'maintaining balance in ' + sessionSummary.asana + ' can be challenging. The top corrections included reminders to maintain proper alignment, which are essential for achieving the correct posture. Remember, it\'s perfectly okay to take your time with these adjustments.'}</p>
                  </div>

                  {/* Mental Wellness Benefits */}
                  <div style={{ marginBottom:'32px' }}>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>✨ Mental Wellness Benefits</h3>
                    <p style={{ margin:0, lineHeight:'1.8', color:'#d1e2f0' }}>Practicing {sessionSummary.asana} offers several mental wellness benefits. This pose encourages mindfulness, helping to ground you in the present moment. By focusing on your breath and body, you can reduce stress and anxiety. Even in this short session, you likely experienced a sense of calm and clarity. Regular practice can enhance your mood and promote a positive mindset, making it easier to navigate daily challenges.</p>
                  </div>

                  {/* What to Improve */}
                  <div>
                    <h3 style={{ margin:'0 0 16px 0', color:'var(--accent)', borderLeft:'4px solid var(--accent)', paddingLeft:'12px' }}>🚀 What to Improve</h3>
                    <ul style={{ margin:0, paddingLeft:'20px', lineHeight:'1.8', color:'#d1e2f0' }}>
                      <li>Focus on maintaining steady breathing throughout the pose</li>
                      <li>Work on consistent alignment with regular practice</li>
                      <li>Build endurance by holding the pose for longer durations</li>
                      <li>Practice {sessionSummary.userProfile?.fitnessLevel === 'beginner' ? '2-3 times per week' : sessionSummary.userProfile?.fitnessLevel === 'moderate' ? '4-5 times per week' : '5-6 times per week'} for steady progress</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ padding:'40px', textAlign:'center', color:'var(--muted)' }}>
                  <p>No report data available. Please complete a practice session first.</p>
                  <button className="secondary-nav-btn" onClick={() => setView('livePractice')} style={{ marginTop:'16px' }}>Start a Session</button>
                </div>
              )}

              {/* Visuals Section - Display Captured Frames */}
              <div className="info-box" style={{ marginTop:'10px' }}>
                <h3 style={{ marginBottom:'16px', color:'var(--accent)' }}>📸 Session Captured Moments</h3>
                {sessionSummary?.frames && sessionSummary.frames.length > 0 ? (
                  <div id="reportVisuals" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px' }}>
                    {sessionSummary.frames.map((frame, idx) => (
                      <div key={idx} style={{ background:'rgba(54, 244, 163, 0.08)', borderRadius:'12px', border:'1px solid rgba(54, 244, 163, 0.2)', overflow:'hidden', boxShadow:'0 4px 12px rgba(0,0,0,0.3)' }}>
                        <img src={frame} alt={`Session frame ${idx + 1}`} style={{ width:'100%', height:'160px', objectFit:'cover', display:'block' }} />
                        <div style={{ padding:'10px', background:'rgba(5,16,27,0.8)', borderTop:'1px solid rgba(54, 244, 163, 0.15)' }}>
                          <p style={{ margin:0, fontSize:'0.85rem', color:'#7dd8ff', fontWeight:700 }}>Frame {idx + 1}</p>
                          <p style={{ margin:'2px 0 0 0', fontSize:'0.75rem', color:'var(--muted)' }}>~{(idx + 1) * 2}s into session</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding:'40px 20px', textAlign:'center', background:'rgba(156,197,220,0.05)', borderRadius:'12px', border:'1px dashed var(--stroke)', color:'var(--muted)' }}>
                    <p style={{ margin:0, fontSize:'0.9rem' }}>No frame captures were recorded during this session.</p>
                    <p style={{ margin:'8px 0 0 0', fontSize:'0.8rem' }}>Frames capture every 2 seconds during practice.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Chatbot Overlay (for report view) */}
          {chatOpen && (
            <div className="report-assistant-panel" style={{ position:'fixed', bottom:'100px', right:'32px', width:'400px', zIndex:100, background:'linear-gradient(170deg, rgba(14,38,62,0.99), rgba(7,19,33,0.99))', border:'1px solid rgba(54, 244, 163, 0.2)', borderRadius:'24px', boxShadow:'0 25px 60px rgba(0,0,0,0.7)', overflow:'hidden', animation:'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div className="chatbot-box" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'12px', borderBottom:'1px solid rgba(54, 244, 163, 0.15)' }}>
                  <div>
                    <h2 style={{ fontSize:'1.15rem', margin:0, fontWeight:700, color:'#fff' }}>Session Assistant</h2>
                    <p style={{ margin:'4px 0 0 0', fontSize:'0.8rem', color:'#7dd8ff' }}>AI-powered guidance</p>
                  </div>
                  <button className="secondary-nav-btn" style={{ padding:'6px 12px', fontSize:'0.8rem', borderRadius:'10px', background:'rgba(255,68,68,0.15)', border:'1px solid rgba(255,68,68,0.3)', color:'#ff6b6b' }} onClick={() => setChatOpen(false)}>✕</button>
                </div>
                <div style={{ height:'320px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', paddingRight:'4px' }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-bot'}>{m.text}</div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="chatbot-form" onSubmit={sendChat} style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    placeholder="Ask about your session..." 
                    style={{ flex:1, padding:'12px 14px', borderRadius:'12px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(54, 244, 163, 0.25)', color:'var(--text)', fontSize:'0.87rem', transition:'all 0.3s' }} 
                  />
                  <button type="submit" disabled={chatSending} style={{ padding:'12px 18px', borderRadius:'12px', background:'linear-gradient(135deg, #36f4a3, #29a9ff)', color:'#03101c', fontWeight:700, fontSize:'0.85rem', cursor: chatSending ? 'not-allowed' : 'pointer', opacity: chatSending ? 0.6 : 1 }}>
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
