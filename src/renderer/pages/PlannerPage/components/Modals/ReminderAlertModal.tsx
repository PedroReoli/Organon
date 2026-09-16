export const ReminderAlertModal = ({ isOpen, message, onClose, onSnooze }: { isOpen: boolean, message: string, onClose: () => void, onSnooze: () => void }) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 1000 }}>
            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '8px' }}>Reminder</div>
            <div>{message}</div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '4px', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
                <button onClick={onSnooze} style={{ flex: 1, padding: '4px', background: 'var(--color-primary)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Snooze 15m</button>
            </div>
        </div>
    )
}
