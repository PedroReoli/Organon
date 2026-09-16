// Custom event dispatchers for the UI components
export const dispatchPlanningEvent = (eventName: string, payload?: any) => {
    window.dispatchEvent(new CustomEvent(`planning:${eventName}`, { detail: payload }));
}
