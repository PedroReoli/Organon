export const transcriptsStyles = `
.transcripts-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  background: var(--color-background, #0f172a);
  color: var(--color-text, #f8fafc);
  overflow: hidden;
}

/* ---- Toolbar Responsiva ---- */
.transcripts-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  background: color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.transcripts-toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.transcripts-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transcripts-toolbar-center {
  flex: 1;
  min-width: 220px;
  display: flex;
  justify-content: center;
}

.transcripts-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.transcripts-btn-primary,
.transcripts-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.transcripts-btn-primary {
  background: linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, #6366f1 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.transcripts-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.5);
}

.transcripts-btn-secondary {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.transcripts-btn-secondary:hover {
  background: rgba(239, 68, 68, 0.22);
  border-color: #ef4444;
  color: #fca5a5;
}

/* ---- Busca ---- */
.transcripts-search {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.transcripts-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted, #94a3b8);
  pointer-events: none;
}

.transcripts-search-input {
  width: 100%;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 7px 32px 7px 34px;
  color: var(--color-text, #f8fafc);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.transcripts-search-input:focus {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #3b82f6) 25%, transparent);
}

.transcripts-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: none;
  background: var(--color-surface, #1e293b);
  border-radius: 50%;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.transcripts-search-clear:hover {
  background: #ef4444;
  color: white;
}

/* ---- Stats & Badges ---- */
.transcripts-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.transcripts-stats strong {
  color: var(--color-text, #f8fafc);
  font-weight: 700;
}

.transcripts-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
  background: color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
}

/* ---- Filter Tabs ---- */
.transcripts-filter-tabs {
  display: flex;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 2px;
}

.transcripts-filter-tab {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.transcripts-filter-tab:hover {
  color: var(--color-text, #f8fafc);
}

.transcripts-filter-tab.is-active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

/* ---- View Toggle ---- */
.transcripts-view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 2px;
}

.transcripts-view-btn {
  width: 28px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.transcripts-view-btn:hover {
  color: var(--color-text, #f8fafc);
}

.transcripts-view-btn.is-active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

/* ---- Content Area ---- */
.transcripts-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* ---- Empty & No Results ---- */
.transcripts-empty,
.transcripts-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  min-height: 280px;
  color: var(--color-text-muted, #94a3b8);
}

.transcripts-empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #f8fafc);
}

.transcripts-empty-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.transcripts-empty-text kbd {
  background: var(--color-surface, #1e293b);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-family: monospace;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
}

/* ---- Grid Layout ---- */
.transcripts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.transcripts-grid.is-list {
  grid-template-columns: 1fr;
}

/* ---- Card Glassmorphic ---- */
.transcripts-card {
  background: color-mix(in srgb, var(--color-surface, #1e293b) 65%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.transcripts-card:hover {
  border-color: var(--color-primary, #3b82f6);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.transcripts-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.transcripts-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  min-width: 0;
}

.transcripts-card-icon {
  color: var(--color-primary, #3b82f6);
  flex-shrink: 0;
}

.transcripts-card-time {
  font-weight: 600;
  color: var(--color-text, #f8fafc);
  white-space: nowrap;
}

.transcripts-card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.transcripts-card-action {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.transcripts-card-action:hover {
  background: var(--color-background, #0f172a);
  color: var(--color-text, #f8fafc);
}

.transcripts-card-action-danger:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}

.transcripts-card-content {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text, #f8fafc);
  max-height: 120px;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease;
}

.transcripts-card-content.is-open {
  max-height: 800px;
  overflow-y: auto;
}

.transcripts-expand-btn {
  border: none;
  background: transparent;
  color: var(--color-primary, #3b82f6);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  padding: 0;
  margin-top: -4px;
}

/* ============================================================
   RESPONSIVIDADE (7 BREAKPOINTS)
   ============================================================ */

@media (max-width: 1024px) {
  .transcripts-toolbar-top {
    flex-direction: column;
    align-items: stretch;
  }
  .transcripts-toolbar-center {
    max-width: 100%;
  }
  .transcripts-search {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .transcripts-content {
    padding: 14px;
  }
  .transcripts-grid {
    grid-template-columns: 1fr;
  }
  .transcripts-toolbar-right {
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .transcripts-toolbar {
    padding: 10px 12px;
  }
  .transcripts-stats {
    display: none;
  }
  .transcripts-card {
    padding: 12px;
  }
}

@media (max-width: 375px) {
  .transcripts-btn-primary span,
  .transcripts-btn-secondary span {
    display: none;
  }
}
`
