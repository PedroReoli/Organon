import React from 'react'
import type { StudyMediaItem } from '@types'
import { clampVolume } from '@Study/study/utils'

interface AudioPanelProps {
  mediaInput:    string
  setMediaInput: (v: string) => void
  mediaError:    string | null
  mediaItems:    StudyMediaItem[]
  youtubePlaying: Record<string, boolean>
  audioRefs:     React.MutableRefObject<Record<string, HTMLAudioElement | null>>
  addMediaItem:  () => void
  updateMediaItem: (mediaId: string, updates: Partial<StudyMediaItem>) => void
  removeMediaItem: (mediaId: string) => void
  toggleYoutubePreviewPlayback: (item: StudyMediaItem) => void
  sendYoutubeCommand: (mediaId: string, command: 'playVideo' | 'pauseVideo' | 'setVolume', args?: Array<number | string>) => void
}

export const AudioPanel = ({
  mediaInput, setMediaInput, mediaError, mediaItems, youtubePlaying, audioRefs,
  addMediaItem, updateMediaItem, removeMediaItem, toggleYoutubePreviewPlayback, sendYoutubeCommand,
}: AudioPanelProps) => (
  <div className="study-panel-section">
    <h3>Audio / Video</h3>
    <div className="study-input-row">
      <input
        type="text"
        value={mediaInput}
        onChange={e => setMediaInput(e.target.value)}
        placeholder="Cole link de YouTube ou audio"
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); addMediaItem() }
        }}
      />
      <button type="button" className="study-btn study-btn-icon" onClick={addMediaItem} title="Adicionar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
    {mediaError && <p className="study-panel-error">{mediaError}</p>}

    <div className="study-media-list">
      {mediaItems.length === 0 && (
        <p className="study-panel-hint">Nenhuma midia adicionada.</p>
      )}

      {mediaItems.map(item => (
        <article key={item.id} className={`study-media-item ${item.kind === 'youtube' ? 'is-youtube' : ''}`}>
          <div className="study-media-item-head">
            <div>
              <span className={`study-media-kind ${item.kind}`}>{item.kind === 'youtube' ? 'YouTube' : 'Audio'}</span>
              <strong>{item.title}</strong>
            </div>
            <div className="study-media-item-actions">
              <button
                type="button"
                className="study-btn study-btn-ghost study-btn-icon"
                onClick={() => updateMediaItem(item.id, { showDock: !item.showDock })}
                title={item.showDock ? 'Ocultar do player' : 'Mostrar no player'}
              >
                {item.showDock ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.62-1.76 1.68-3.31 3.06-4.5" />
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                    <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-4.09 5.09" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="study-btn study-btn-danger study-btn-icon"
                onClick={() => removeMediaItem(item.id)}
                title="Remover midia"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {item.kind === 'youtube' && item.youtubeVideoId && (
            <div className="study-media-inline-youtube">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&controls=0&disablekb=1`}
                title={`study-media-preview-${item.id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
                allowFullScreen
              />
              <div className="study-media-youtube-controls">
                <button
                  type="button"
                  className="study-btn study-btn-ghost study-btn-icon"
                  onClick={() => toggleYoutubePreviewPlayback(item)}
                  title={youtubePlaying[item.id] ? 'Pausar no player' : 'Tocar no player'}
                >
                  {youtubePlaying[item.id] ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <polygon points="8 5 19 12 8 19" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className={`study-btn study-btn-ghost study-btn-icon ${item.loop ? 'is-active' : ''}`}
                  onClick={() => updateMediaItem(item.id, { loop: !item.loop })}
                  title={item.loop ? 'Loop ligado' : 'Loop desligado'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M17 1v4M7 1v4M3 10a9 9 0 1 0 18 0a9 9 0 0 0-18 0Z" />
                    <path d="M8 10a4 4 0 1 1 8 0" />
                  </svg>
                </button>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={item.volume}
                  onChange={e => {
                    const nextVolume = clampVolume(Number(e.target.value))
                    updateMediaItem(item.id, { volume: nextVolume })
                    sendYoutubeCommand(item.id, 'setVolume', [Math.round(nextVolume * 100)])
                  }}
                  className="study-media-volume-range"
                  title="Volume do player"
                />
              </div>
            </div>
          )}

          {item.kind === 'audio' && (
            <>
              <audio
                ref={el => { audioRefs.current[item.id] = el }}
                controls
                src={item.url}
                className="study-audio-player"
              />
              <div className="study-media-audio-config">
                <label className="study-input-group">
                  Volume
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={item.volume}
                    onChange={e => updateMediaItem(item.id, { volume: clampVolume(Number(e.target.value)) })}
                  />
                </label>
                <label className="study-mute-toggle">
                  <input
                    type="checkbox"
                    checked={item.loop}
                    onChange={e => updateMediaItem(item.id, { loop: e.target.checked })}
                  />
                  Loop
                </label>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  </div>
)
