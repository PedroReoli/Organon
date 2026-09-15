import React from 'react'
import type { StudyMediaItem } from '@types'

interface MediaDockProps {
  dockMediaItems:  StudyMediaItem[]
  dockCollapsed:   boolean
  setDockCollapsed: (updater: (prev: boolean) => boolean) => void
  youtubePlaying:  Record<string, boolean>
  youtubeDockRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>
  audioRefs:       React.MutableRefObject<Record<string, HTMLAudioElement | null>>
  sendYoutubeCommand: (mediaId: string, command: 'playVideo' | 'pauseVideo' | 'setVolume', args?: Array<number | string>) => void
}

export const MediaDock = ({
  dockMediaItems, dockCollapsed, setDockCollapsed,
  youtubePlaying, youtubeDockRefs, audioRefs, sendYoutubeCommand,
}: MediaDockProps) => {
  if (dockMediaItems.length === 0) return null

  return (
    <div className={`study-video-player study-media-dock ${dockCollapsed ? 'is-collapsed' : ''}`}>
      <div className="study-media-dock-topbar">
        <strong>Player ({dockMediaItems.length})</strong>
        <button
          type="button"
          className="study-btn study-btn-ghost study-btn-icon study-media-dock-toggle"
          onClick={() => setDockCollapsed(prev => !prev)}
          title={dockCollapsed ? 'Expandir player' : 'Recolher player'}
        >
          {dockCollapsed ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="m6 15 6-6 6 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>
      </div>

      <div className="study-media-dock-body">
        {dockMediaItems.map(item => {
          if (item.kind === 'youtube' && item.youtubeVideoId) {
            return (
              <article key={item.id} className="study-media-dock-item study-media-dock-item-youtube">
                <header>{item.title}</header>
                <iframe
                  ref={el => { youtubeDockRefs.current[item.id] = el }}
                  src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&loop=${item.loop ? 1 : 0}&playlist=${item.youtubeVideoId}`}
                  title={`study-media-${item.id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => {
                    sendYoutubeCommand(item.id, 'setVolume', [Math.round(item.volume * 100)])
                    if (youtubePlaying[item.id]) sendYoutubeCommand(item.id, 'playVideo')
                  }}
                  allowFullScreen
                />
              </article>
            )
          }

          return (
            <article key={item.id} className="study-media-dock-item">
              <header>{item.title}</header>
              <audio
                ref={el => { audioRefs.current[item.id] = el }}
                controls
                src={item.url}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}
