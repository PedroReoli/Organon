export const triggerPlanningSync = () => {
    // Force the app to reload the store from disk when the CLI makes changes
    window.dispatchEvent(new CustomEvent('organon:planning-sync'));
};

export const listenForCliSync = (callback: () => void) => {
    if (window.electronAPI && window.electronAPI.onPlanningSync) {
        return window.electronAPI.onPlanningSync(callback);
    }

    // Fallback for non-electron env
    const handler = () => {
        callback();
    };
    window.addEventListener('organon:planning-sync', handler);
    return () => window.removeEventListener('organon:planning-sync', handler);
};
