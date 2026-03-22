const FALLBACK_ASANA_CATALOG = [
	{
		id: 'konasana',
		name: 'Konasana',
		description:
			'Konasana (angle pose) stretches the sides of the body, improves spinal flexibility, and helps with balance and breathing control. Keep both feet grounded and lengthen through the raised arm while bending sideways.',
		faqs: [
			'Q: Should my knees bend? A: Keep both knees straight but not locked.',
			'Q: How far should I bend? A: Bend until you feel a stretch without collapsing your chest.',
			'Q: Where should my gaze be? A: Look forward or slightly upward while keeping the neck relaxed.',
		],
		photoLinks: ['/poses/pose-1.png', '/poses/pose-2.png', '/poses/pose-3.png'],
		videoLinks: ['https://www.w3schools.com/html/mov_bbb.mp4'],
		tutorialCaption: 'Follow this guided Konasana demo video.',
	},
];

function getAsanaDataMap() {
	const catalog = Array.isArray(window.__yogmitraAsanas) && window.__yogmitraAsanas.length
		? window.__yogmitraAsanas
		: FALLBACK_ASANA_CATALOG;

	const map = {};
	for (const asana of catalog) {
		const asanaName = asana?.name || asana?.id || 'Unknown Asana';
		const photoLinks = Array.isArray(asana?.photoLinks) ? asana.photoLinks : [];
		const videoLinks = Array.isArray(asana?.videoLinks) ? asana.videoLinks : [];

		map[asanaName] = {
			description: asana?.description || 'Details not available.',
			faqs: Array.isArray(asana?.faqs) && asana.faqs.length ? asana.faqs : ['Details not available.'],
			tutorialVideo: {
				caption: asana?.tutorialCaption || 'Details not available.',
				videoUrl: videoLinks[0] || 'https://www.w3schools.com/html/mov_bbb.mp4',
			},
			poseImages: photoLinks.map((src, index) => ({
				src,
				alt: `${asanaName} pose example ${index + 1}`,
			})),
		};
	}

	return map;
}

function getPredictionClass(label) {
	if (label === 'correct') return 'pred-correct';
	if (label === 'moderate') return 'pred-moderate';
	if (label === 'incorrect') return 'pred-incorrect';
	return '';
}

export function initDashboard({ onAsanaChanged, onGenerateReport, onLogout, onStartSession, onEndSession }) {
	const asanaSelect = document.getElementById('asanaSelect');
	const asanaDescription = document.getElementById('asanaDescription');
	const faqList = document.getElementById('faqList');
	const tutorialVideo = document.getElementById('tutorialVideo');
	const tutorialCaption = document.getElementById('tutorialCaption');
	const tutorialPoseGallery = document.getElementById('tutorialPoseGallery');
	const tutorialModeToggle = document.getElementById('tutorialModeToggle');
	const generateReportBtn = document.getElementById('generateReportBtn');
	const startSessionBtn = document.getElementById('startSessionBtn');
	const endSessionBtn = document.getElementById('endSessionBtn');
	const logoutBtn = document.getElementById('logoutBtn');
	let currentTutorialMode = 'pose';
	const ASANA_DATA = getAsanaDataMap();

	function setTutorialMode(mode) {
		currentTutorialMode = mode;
		const showPose = mode !== 'video';

		tutorialPoseGallery.classList.toggle('hidden', !showPose);
		tutorialVideo.classList.toggle('hidden', showPose);
		tutorialModeToggle.textContent = showPose ? 'Show Video' : 'Show Pose';
	}

	function renderPoseGallery(images) {
		tutorialPoseGallery.innerHTML = '';
		if (!images.length) {
			const emptyItem = document.createElement('div');
			emptyItem.className = 'tutorial-pose-item tutorial-pose-item-empty';
			emptyItem.textContent = 'Pose images not available.';
			tutorialPoseGallery.appendChild(emptyItem);
			return;
		}

		for (const image of images) {
			const item = document.createElement('div');
			item.className = 'tutorial-pose-item';

			const img = document.createElement('img');
			img.src = image.src;
			img.alt = image.alt;

			item.appendChild(img);
			tutorialPoseGallery.appendChild(item);
		}
	}

	function renderAsana(asanaName) {
		const config = ASANA_DATA[asanaName] || ASANA_DATA.Konasana || Object.values(ASANA_DATA)[0];
		asanaDescription.textContent = config.description;
		faqList.innerHTML = config.faqs.map((item) => `<li>${item}</li>`).join('');
		tutorialVideo.src = config.tutorialVideo.videoUrl;
		tutorialCaption.textContent = config.tutorialVideo.caption;
		renderPoseGallery(config.poseImages);
		setTutorialMode('pose');
		onAsanaChanged(asanaName);
	}

	tutorialModeToggle.addEventListener('click', () => {
		setTutorialMode(currentTutorialMode === 'pose' ? 'video' : 'pose');
	});

	asanaSelect.addEventListener('change', () => renderAsana(asanaSelect.value));
	generateReportBtn.addEventListener('click', onGenerateReport);
	if (startSessionBtn && typeof onStartSession === 'function') {
		startSessionBtn.addEventListener('click', onStartSession);
	}
	if (endSessionBtn && typeof onEndSession === 'function') {
		endSessionBtn.addEventListener('click', onEndSession);
	}
	if (logoutBtn && typeof onLogout === 'function') {
		logoutBtn.addEventListener('click', onLogout);
	}

	renderAsana(asanaSelect.value);
}

export function renderPrediction({ label, confidence, score, feedback }) {
	const predictionEl = document.getElementById('predictionResult');
	const confidenceEl = document.getElementById('predictionConfidence');
	const scoreEl = document.getElementById('poseScore');
	const feedbackList = document.getElementById('feedbackList');

	predictionEl.textContent = label ? label.toUpperCase() : '-';
	predictionEl.className = getPredictionClass(label);
	confidenceEl.textContent = Number.isFinite(confidence) ? `${(confidence * 100).toFixed(1)}%` : '-';
	scoreEl.textContent = Number.isFinite(score) ? score.toFixed(1) : '-';

	feedbackList.innerHTML = '';
	const items = feedback?.length ? feedback : ['Waiting for stable pose...'];
	for (const message of items) {
		const li = document.createElement('li');
		li.textContent = message;
		feedbackList.appendChild(li);
	}
}

export function renderStatus(message) {
	document.getElementById('statusText').textContent = message;
}

export function renderReport(text) {
	document.getElementById('reportOutput').textContent = text;
}

export function renderLiveCoachTip(text) {
	const liveCoachEl = document.getElementById('liveCoachTip');
	if (!liveCoachEl) {
		return;
	}

	liveCoachEl.textContent = text || 'Start session to get real-time posture cues.';
}

export function setSessionControlState(sessionActive) {
	const startSessionBtn = document.getElementById('startSessionBtn');
	const endSessionBtn = document.getElementById('endSessionBtn');
	if (!startSessionBtn || !endSessionBtn) {
		return;
	}

	startSessionBtn.disabled = Boolean(sessionActive);
	endSessionBtn.disabled = !sessionActive;
}

export function renderSessionSummary(sessionReport) {
	const summaryEl = document.getElementById('sessionSummary');
	if (!summaryEl) {
		return;
	}

	if (!sessionReport) {
		summaryEl.textContent = 'No session completed yet.';
		return;
	}

	const consistency = sessionReport.totalFrames
		? (sessionReport.correctFrameCount / sessionReport.totalFrames) * 100
		: 0;
	const visibilityQuality = sessionReport.totalCapturedFrames
		? ((sessionReport.totalCapturedFrames - sessionReport.skippedFrameCount) / sessionReport.totalCapturedFrames) * 100
		: 0;
	summaryEl.textContent = `Result: ${sessionReport.finalResult} | Avg: ${sessionReport.averageScore.toFixed(2)}/10 | Consistency: ${consistency.toFixed(0)}% | Visibility: ${visibilityQuality.toFixed(0)}% | Duration: ${sessionReport.sessionDuration}`;
}

export function setWelcomeText(user) {
	const text = user?.fullName
		? `Welcome, ${user.fullName} (${user.email})`
		: `Welcome, ${user?.email || 'User'}`;
	document.getElementById('welcomeText').textContent = text;
}
