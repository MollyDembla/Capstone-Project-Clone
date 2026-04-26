import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeAccuracy(input) {
  const n = toNumber(input, 0);
  const ratio = n > 1 ? n / 100 : n;
  return clamp(ratio, 0, 1);
}

function normalizeAngles(angles) {
  if (!Array.isArray(angles)) {
    return [];
  }
  return angles.map((v) => toNumber(v, 0));
}

function getCorrectionCounts(anglesInput) {
  if (!anglesInput || typeof anglesInput !== "object") {
    return {};
  }

  const source =
    anglesInput.correctionCounts &&
    typeof anglesInput.correctionCounts === "object"
      ? anglesInput.correctionCounts
      : {};

  const cleaned = {};
  Object.entries(source).forEach(([k, v]) => {
    const key = String(k || "").trim();
    if (!key) return;
    const count = Math.max(0, Math.floor(toNumber(v, 0)));
    if (count > 0) {
      cleaned[key] = count;
    }
  });
  return cleaned;
}

function getAverageAngleError(anglesInput) {
  if (Number.isFinite(anglesInput)) {
    return Math.max(0, anglesInput);
  }

  if (anglesInput && typeof anglesInput === "object") {
    if (Number.isFinite(anglesInput.avgError)) {
      return Math.max(0, Math.abs(anglesInput.avgError));
    }
  }

  const angles = normalizeAngles(anglesInput);
  if (angles.length === 0) {
    return 0;
  }

  const sum = angles.reduce((acc, val) => acc + Math.abs(val), 0);
  return sum / angles.length;
}

function getTimingDeviationMs(timingInput) {
  // Trikonasana ideal timings (ms from session start)
  // step1: 0 ms  | step2: 5000 ms  | step3: 12000 ms
  if (Number.isFinite(timingInput)) {
    return Math.abs(timingInput);
  }

  if (timingInput && typeof timingInput === "object") {
    if (Number.isFinite(timingInput.sessionDurationSec)) {
      // Full 3-step Trikonasana ideally takes ~20 s
      const targetSec = 20;
      return Math.abs((timingInput.sessionDurationSec - targetSec) * 1000);
    }

    const delays =
      timingInput.delays && typeof timingInput.delays === "object"
        ? timingInput.delays
        : timingInput;

    const vals = [
      delays.step1Delay,
      delays.step2Delay,
      delays.step3Delay,
      delays.step1,
      delays.step2,
      delays.step3,
    ].filter(Number.isFinite);

    if (vals.length > 0) {
      return vals.reduce((acc, v) => acc + Math.abs(v), 0) / vals.length;
    }
  }

  return 0;
}

function computeFallbackScore({ accuracy, angleError, timingDeviationMs }) {
  const accuracyScore = normalizeAccuracy(accuracy) * 100;
  const angleScore = clamp(1 - angleError / 45, 0, 1) * 100;
  const timingScore = clamp(1 - timingDeviationMs / 2000, 0, 1) * 100;

  const weighted = accuracyScore * 0.5 + angleScore * 0.3 + timingScore * 0.2;
  return Number(weighted.toFixed(2));
}

function buildFallbackReport(metrics) {
  const accuracyRatio = normalizeAccuracy(metrics.accuracy);
  const angleError = getAverageAngleError(metrics.angles);
  const timingDeviationMs = getTimingDeviationMs(metrics.timing);
  const correctionCounts = getCorrectionCounts(metrics.angles);
  const finalScore = computeFallbackScore({
    accuracy: accuracyRatio,
    angleError,
    timingDeviationMs,
  });

  const strengths = [];
  const improvements = [];

  if (accuracyRatio >= 0.8)
    strengths.push("Step classification is consistent and reliable.");
  if (angleError <= 12)
    strengths.push("Joint alignment is close to ideal targets.");
  if (timingDeviationMs <= 400)
    strengths.push("Step timing is well controlled.");

  if (accuracyRatio < 0.8)
    improvements.push("Improve transition consistency between steps.");
  if (angleError > 12)
    improvements.push(
      "Focus on correcting key joint angles (arms, hips, knees).",
    );
  if (timingDeviationMs > 400)
    improvements.push("Work on holding each step closer to target timing.");

  if (strengths.length === 0) {
    strengths.push("Session completed with measurable pose data.");
  }

  if (improvements.length === 0) {
    improvements.push(
      "Maintain current performance and increase hold stability.",
    );
  }

  const summary = `Session score ${finalScore}/100. Accuracy ${(accuracyRatio * 100).toFixed(1)}%, avg angle error ${angleError.toFixed(1)} degrees, timing deviation ${Math.round(timingDeviationMs)} ms.`;

  const topCorrections = Object.entries(correctionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([msg, count], idx) => `${idx + 1}. ${msg} (seen ${count} times)`);

  const correctionSection =
    topCorrections.length > 0
      ? topCorrections.join("\n")
      : "1. Keep full body visible in frame and maintain steady breathing.";

  const report = [
    "### 1) Session Performance Summary",
    `In your recent Trikonasana (Triangle Pose) session, your overall score was ${finalScore.toFixed(2)}/100.`,
    `Model-estimated pose accuracy: ${(accuracyRatio * 100).toFixed(1)}%. Average joint-angle error: ${angleError.toFixed(2)} degrees.`,
    `Timing deviation from ideal step rhythm (Step1=0s, Step2=5s, Step3=12s): ${Math.round(timingDeviationMs)} ms.`,
    "",
    "### 2) Trikonasana Technique Breakdown",
    "The model assessed posture quality using joint alignment, lateral stability, and step-transition timing.",
    angleError > 20
      ? "Step alignment is significantly off — major joints deviate from the Trikonasana geometry."
      : angleError > 12
        ? "Alignment is moderate — the lateral tilt and arm extension need more consistency."
        : "Alignment is strong — the triangle geometry is well-formed with only minor corrections needed.",
    timingDeviationMs > 900
      ? "Step transition timing needs improvement — hold each step closer to the ideal duration."
      : "Step transition timing is well controlled.",
    "",
    "### 3) What Needs Improvement",
    ...improvements.map((item, idx) => `${idx + 1}. ${item}`),
    "",
    "### 4) Top Detected Alignment Corrections",
    correctionSection,
    "",
    "### 5) Corrective Drills for Trikonasana",
    "1. Wall Triangle Drill (5 min): Stand with back heel on a wall; bend laterally while keeping the chest open and both legs straight.",
    "2. Strap-Assisted Deep Reach (5 min): Loop a strap around the front ankle and hold end with lower hand — deepen the stretch without collapsing the chest.",
    "3. Breath-Hold Stability (8 min): At full Step 3 depth, inhale 4 counts, hold 4 counts, exhale 6 counts × 5 reps per side.",
    "",
    "### 6) Next Session Targets",
    `Aim for accuracy above ${Math.min(95, Math.round(accuracyRatio * 100 + 8))}% and reduce average angle error below ${Math.max(8, Math.round(angleError - 3))} degrees.`,
  ].join("\n");

  return {
    summary,
    strengths,
    improvements,
    report,
    finalScore,
  };
}

function parseJsonFromModelText(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!fenced || !fenced[1]) {
      throw new Error("Model output is not valid JSON");
    }
    return JSON.parse(fenced[1]);
  }
}

async function generateAiReport(metrics, fallbackReport) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return fallbackReport;
  }

  const prompt = {
    role: "user",
    content: [
      "You are a certified yoga coach assistant specialising in Trikonasana (Triangle Pose) for mental health.",
      "Generate a detailed, structured JSON report for this Trikonasana session.",
      "Return ONLY valid JSON with keys: summary, strengths, improvements, report, finalScore.",
      "The report field must be multi-section markdown with exactly 6 sections:",
      "1) Session Performance Summary (include score, accuracy, angle error, timing)",
      "2) Trikonasana Technique Breakdown (assess each of the 3 steps: Wide Stance, Lateral Bend, Full Triangle)",
      "3) What Needs Improvement (list concrete action items)",
      "4) Top Detected Alignment Corrections (from correctionCounts in the metrics)",
      "5) Corrective Drills for Trikonasana (3 specific drills with timing)",
      "6) Next Session Targets (personalised score and angle targets)",
      "strengths and improvements must be string arrays.",
      "finalScore must be a number 0-100.",
      "Session metrics (pose=Trikonasana, step1=0s, step2=5s, step3=12s ideal timings):",
      JSON.stringify(metrics),
    ].join("\n"),
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:4000",
      "X-Title": process.env.OPENROUTER_TITLE || "Yoga Pose Report API",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [prompt],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== "string") {
    throw new Error("OpenRouter returned empty content");
  }

  const parsed = parseJsonFromModelText(text);

  return {
    summary: String(parsed.summary || fallbackReport.summary),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String)
      : fallbackReport.strengths,
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map(String)
      : fallbackReport.improvements,
    report: String(parsed.report || fallbackReport.report),
    finalScore: clamp(
      toNumber(parsed.finalScore, fallbackReport.finalScore),
      0,
      100,
    ),
  };
}

app.post("/api/report", async (req, res) => {
  try {
    const { accuracy, angles, timing } = req.body || {};

    if (
      accuracy === undefined ||
      angles === undefined ||
      timing === undefined
    ) {
      return res.status(400).json({
        error: "Missing required metrics. Expected: accuracy, angles, timing",
      });
    }

    const metrics = { accuracy, angles, timing };
    const fallbackReport = buildFallbackReport(metrics);

    let report;
    try {
      report = await generateAiReport(metrics, fallbackReport);
    } catch (err) {
      report = fallbackReport;
    }

    return res.json(report);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to generate report",
      details: err.message,
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Yoga report API running on http://localhost:${PORT}`);
});
