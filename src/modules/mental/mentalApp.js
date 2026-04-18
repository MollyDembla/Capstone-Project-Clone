import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MentalApp from './MentalApp.jsx';

let mentalRoot = null;
let mentalContainer = null;

export function startMentalApp() {
	// Get the active user from session storage (same as sedentary module uses)
	let currentUser = null;
	try {
		const session = JSON.parse(localStorage.getItem('sedentary_session') || 'null');
		if (session?.user) currentUser = session.user;
	} catch (_) {}

	const userName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'User';

	// Hide sedentary shell views
	const dashboardView = document.getElementById('dashboardView');
	const livePracticeView = document.getElementById('livePracticeView');
	const reportView = document.getElementById('reportView');
	const loginView = document.getElementById('loginView');
	const feedbackModal = document.getElementById('sessionFeedbackModal');
	const moduleModal = document.getElementById('moduleSelectModal');

	[dashboardView, livePracticeView, reportView, feedbackModal, moduleModal].forEach(el => {
		if (el) el.classList.add('hidden');
	});

	// Create or reuse the mental module mount point
	mentalContainer = document.getElementById('mentalModuleRoot');
	if (!mentalContainer) {
		mentalContainer = document.createElement('div');
		mentalContainer.id = 'mentalModuleRoot';
		document.body.appendChild(mentalContainer);
	}
	mentalContainer.style.display = 'block';

	function handleLogout() {
		// Clean up React tree
		if (mentalRoot) {
			mentalRoot.unmount();
			mentalRoot = null;
		}
		if (mentalContainer) {
			mentalContainer.style.display = 'none';
		}

		// Clear session and reload to show login
		localStorage.removeItem('sedentary_session');
		window.location.reload();
	}

	mentalRoot = createRoot(mentalContainer);
	mentalRoot.render(
		createElement(MentalApp, { userName, onLogout: handleLogout })
	);
}

export function stopMentalApp() {
	if (mentalRoot) {
		mentalRoot.unmount();
		mentalRoot = null;
	}
	if (mentalContainer) {
		mentalContainer.style.display = 'none';
	}
}
