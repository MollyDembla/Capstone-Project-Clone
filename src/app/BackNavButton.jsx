import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const RETURN_TO_REPORT_KEY = 'yogmitra_return_to_report';

function isVisibleById(id) {
	const el = document.getElementById(id);
	return Boolean(el && !el.classList.contains('hidden'));
}

function detectSurface() {
	if (isVisibleById('profileModal')) return 'profile';
	if (isVisibleById('moduleSelectModal')) return 'moduleSelector';
	if (isVisibleById('reportView')) return 'report';
	if (isVisibleById('livePracticeView')) return 'livePractice';
	if (isVisibleById('dashboardView')) return 'dashboard';
	return 'login';
}

function observeSurfaceChanges(onChange) {
	const observer = new MutationObserver(() => {
		onChange(detectSurface());
	});

	const ids = ['profileModal', 'moduleSelectModal', 'reportView', 'livePracticeView', 'dashboardView', 'loginView'];
	for (const id of ids) {
		const el = document.getElementById(id);
		if (el) {
			observer.observe(el, { attributes: true, attributeFilter: ['class'] });
		}
	}

	return () => observer.disconnect();
}

function showOnly(viewId) {
	const viewIds = ['dashboardView', 'livePracticeView', 'reportView'];
	for (const id of viewIds) {
		const el = document.getElementById(id);
		if (!el) continue;
		el.classList.toggle('hidden', id !== viewId);
	}
}

function openModuleSelectorFromDashboard() {
	const moduleModal = document.getElementById('moduleSelectModal');
	const dashboardView = document.getElementById('dashboardView');
	if (dashboardView) dashboardView.classList.add('hidden');
	if (moduleModal) moduleModal.classList.remove('hidden');
}

export default function BackNavButton() {
	const navigate = useNavigate();
	const location = useLocation();
	const [surface, setSurface] = useState(() => detectSurface());

	useEffect(() => {
		setSurface(detectSurface());
		return observeSurfaceChanges(setSurface);
	}, [location.pathname]);

	useEffect(() => {
		if (location.pathname !== '/' || typeof window === 'undefined') {
			return;
		}

		const shouldReturnToReport = window.sessionStorage.getItem(RETURN_TO_REPORT_KEY) === '1';
		if (!shouldReturnToReport) {
			return;
		}

		window.sessionStorage.removeItem(RETURN_TO_REPORT_KEY);
		showOnly('reportView');
		setSurface('report');
	}, [location.pathname]);

	const isPipelineRoute = location.pathname === '/pipeline';
	const hideOnLogin = location.pathname === '/' && surface === 'login';
	const hideOnModuleSelector = location.pathname === '/' && surface === 'moduleSelector';

	if (!isPipelineRoute && (hideOnLogin || hideOnModuleSelector)) {
		return null;
	}

	function handlePipelineBack() {
		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem(RETURN_TO_REPORT_KEY, '1');
		}

		navigate('/');
		window.setTimeout(() => {
			if (window.location.pathname === '/pipeline') {
				window.location.href = '/';
			}
		}, 180);
	}

	function handleInAppBack() {
		switch (surface) {
			case 'profile': {
				const btn = document.getElementById('profileBackBtn');
				if (btn) {
					btn.click();
				}
				break;
			}
			case 'moduleSelector': {
				const moduleModal = document.getElementById('moduleSelectModal');
				const loginView = document.getElementById('loginView');
				if (moduleModal) moduleModal.classList.add('hidden');
				if (loginView) loginView.classList.remove('hidden');
				break;
			}
			case 'dashboard': {
				openModuleSelectorFromDashboard();
				break;
			}
			case 'livePractice': {
				showOnly('dashboardView');
				break;
			}
			case 'report': {
				const reportBackBtn = document.getElementById('backToLivePracticeFromReportBtn');
				if (reportBackBtn) {
					reportBackBtn.click();
				} else {
					showOnly('livePracticeView');
				}
				break;
			}
			default:
				break;
		}
	}

	return (
		<button
			type="button"
			className="fixed-back-btn"
			onClick={isPipelineRoute ? handlePipelineBack : handleInAppBack}
			aria-label="Go back"
			title="Back"
		>
			←
		</button>
	);
}
