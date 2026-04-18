import { useEffect } from 'react';
import LegacyBootstrap from './LegacyBootstrap.jsx';

/**
 * Router.jsx - Central module router for YogMitra
 *
 * Routes module selection based on window.__yogmitraActiveModule
 * Supports: sedentary (default) | mental (AI yoga for mental wellness)
 *
 * Each module is completely isolated - no shared logic between modules.
 */
export default function Router() {
	const activeModule = typeof window !== 'undefined' ? window.__yogmitraActiveModule : null;

	useEffect(() => {
		if (activeModule === 'mental') {
			// Lazy-load and boot the mental module
			import('../modules/mental/mentalApp.js')
				.then(({ startMentalApp }) => {
					startMentalApp();
				})
				.catch((err) => {
					console.error('Mental module failed to load:', err);
					const el = document.querySelector('#mentalModuleRoot');
					if (el) el.innerHTML = `<p style="color:#ff6f7d;padding:20px;">Mental module load error: ${err.message}</p>`;
				});
		}
	}, [activeModule]);

	if (activeModule === 'mental') {
		// The mental module mounts itself into #mentalModuleRoot via mentalApp.js
		// Return null — mounting is handled imperatively in the useEffect above
		return null;
	}

	// Default to sedentary module (existing, fully implemented)
	return <LegacyBootstrap />;
}
