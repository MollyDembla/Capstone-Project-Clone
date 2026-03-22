import { useEffect } from 'react';

export default function LegacyBootstrap() {
	useEffect(() => {
		if (window.__yogmitraBootstrapped) {
			return;
		}

		window.__yogmitraBootstrapped = true;

		import('../main.js').catch((error) => {
			const statusEl = document.getElementById('statusText');
			if (statusEl) {
				statusEl.textContent = `App initialization failed: ${error.message}`;
			}
			console.error('YogMitra bootstrap failed', error);
		});
	}, []);

	return null;
}
