import { useEffect, useRef } from 'react'
import type { Card, StudyState } from '@types'
import { useStudyView }    from './hooks/useStudyView'
import { PomodoroCard }    from './PomodoroCard'
import { StudyToolbar }    from './StudyToolbar'
import { MediaDock }       from './MediaDock'
import { WallpaperPanel }  from './panels/WallpaperPanel'
import { AudioPanel }      from './panels/AudioPanel'
import { QuotePanel }      from './panels/QuotePanel'
import { StatsPanel }        from './panels/StatsPanel'
import { GoalsPanel }        from './panels/GoalsPanel'
import { ProductivityAnalytics } from './analytics/ProductivityAnalytics'
import { SessionPresets }    from './SessionPresets'
import { SessionHistory }    from './SessionHistory'
import { GoalFocusSelector } from './GoalFocusSelector'
import { formatHours }     from './utils'

interface StudyViewProps {
  cards:          Card[]
  study:          StudyState
  onUpdateStudy:  (updater: (prev: StudyState) => StudyState) => void
  onUpdatePlanningCard: (cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'priority' | 'status' | 'checklist'>>) => void
}

export const StudyView = ({ cards, study, onUpdateStudy, onUpdatePlanningCard }: StudyViewProps) => {
  const sv = useStudyView({ cards, study, onUpdateStudy, onUpdatePlanningCard })

  const svRef = useRef(sv)
  svRef.current = sv
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.code === 'Space') { e.preventDefault(); svRef.current.toggleTimer() }
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) svRef.current.resetCurrentPhase()
      if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey) svRef.current.skipPhase()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div
      className="study-view"
      style={{
        backgroundImage: sv.wallpaperUrl
          ? `linear-gradient(140deg, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0.62)), url("${sv.wallpaperUrl}")`
          : 'radial-gradient(circle at 18% 14%, var(--color-primary-light) 0%, transparent 30%), radial-gradient(circle at 84% 0%, var(--color-primary-light) 0%, transparent 36%), linear-gradient(140deg, var(--color-background) 0%, var(--color-background-secondary) 52%, var(--color-background) 100%)',
      }}
    >
      <div className="study-left-stack">
        <div className="study-mini-cards">
          <article className="study-card study-card-mini">
            <span className="study-card-label">Tempo total</span>
            <strong className="study-card-value">{formatHours(sv.totalFocusSeconds)}</strong>
          </article>
          <article className="study-card study-card-mini">
            <span className="study-card-label">Metas concluidas</span>
            <strong className="study-card-value">{sv.goalsDone}/{sv.goals.length}</strong>
          </article>
        </div>

        <PomodoroCard
          phase={sv.phase}
          timerRunning={sv.timerRunning}
          secondsLeft={sv.secondsLeft}
          focusMinutes={sv.focusMinutes}
          breakMinutes={sv.breakMinutes}
          muteSound={sv.muteSound}
          setMuteSound={sv.setMuteSound}
          toggleTimer={sv.toggleTimer}
          resetCurrentPhase={sv.resetCurrentPhase}
          skipPhase={sv.skipPhase}
          adjustFocus={sv.adjustFocus}
          adjustBreak={sv.adjustBreak}
        />

        <GoalFocusSelector
          goals={sv.goals}
          focusedGoalId={sv.focusedGoalId}
          onSelect={sv.setFocusedGoalId}
        />
      </div>

      <StudyToolbar activePanel={sv.activePanel} setActivePanel={sv.setActivePanel} />

      {sv.activePanel && (
        <div className="study-floating-panel">
          {sv.activePanel === 'wallpaper' && (
            <WallpaperPanel
              wallpaperUrlInput={sv.wallpaperUrlInput}
              setWallpaperUrlInput={sv.setWallpaperUrlInput}
              imageSearch={sv.imageSearch}
              setImageSearch={sv.setImageSearch}
              searchLoading={sv.searchLoading}
              searchError={sv.searchError}
              searchResults={sv.searchResults}
              searchPage={sv.searchPage}
              setSearchPage={sv.setSearchPage}
              totalSearchPages={sv.totalSearchPages}
              pagedSearchResults={sv.pagedSearchResults}
              applyWallpaperUrl={sv.applyWallpaperUrl}
              handleWallpaperUpload={sv.handleWallpaperUpload}
              searchImages={() => { void sv.searchImages() }}
              setWallpaperUrl={sv.setWallpaperUrl}
            />
          )}

          {sv.activePanel === 'audio' && (
            <AudioPanel
              mediaInput={sv.mediaInput}
              setMediaInput={sv.setMediaInput}
              mediaError={sv.mediaError}
              mediaItems={sv.mediaItems}
              youtubePlaying={sv.youtubePlaying}
              audioRefs={sv.audioRefs}
              addMediaItem={sv.addMediaItem}
              updateMediaItem={sv.updateMediaItem}
              removeMediaItem={sv.removeMediaItem}
              toggleYoutubePreviewPlayback={sv.toggleYoutubePreviewPlayback}
              sendYoutubeCommand={sv.sendYoutubeCommand}
            />
          )}

          {sv.activePanel === 'quote' && (
            <QuotePanel
              currentQuote={sv.currentQuote}
              quoteIndex={sv.quoteIndex}
              setQuoteIndex={sv.setQuoteIndex}
            />
          )}

          {sv.activePanel === 'stats' && (
            <StatsPanel
              totalFocusSeconds={sv.totalFocusSeconds}
              todayFocusSeconds={sv.todayFocusSeconds}
              sessions={sv.sessions}
              goalsOpen={sv.goalsOpen}
            />
          )}

          {sv.activePanel === 'analytics' && (
            <ProductivityAnalytics sessions={sv.sessions} goals={sv.goals} />
          )}

          {sv.activePanel === 'presets' && (
            <SessionPresets study={sv.study} onUpdateStudy={onUpdateStudy} />
          )}

          {sv.activePanel === 'history' && (
            <SessionHistory sessions={sv.sessions} goals={sv.goals} />
          )}

          {sv.activePanel === 'goals' && (
            <GoalsPanel
              goals={sv.goals}
              goalTitle={sv.goalTitle}
              setGoalTitle={sv.setGoalTitle}
              goalChecklistDrafts={sv.goalChecklistDrafts}
              setGoalChecklistDrafts={sv.setGoalChecklistDrafts}
              expandedGoals={sv.expandedGoals}
              setExpandedGoals={sv.setExpandedGoals}
              goalsConfigMode={sv.goalsConfigMode}
              setGoalsConfigMode={sv.setGoalsConfigMode}
              showPlanningPicker={sv.showPlanningPicker}
              setShowPlanningPicker={sv.setShowPlanningPicker}
              availablePlanningCards={sv.availablePlanningCards}
              planningCards={sv.planningCards}
              linkedPlanningCards={sv.linkedPlanningCards}
              updateGoal={sv.updateGoal}
              handleAddGoal={sv.handleAddGoal}
              removeGoal={sv.removeGoal}
              importPlanningCardAsGoal={sv.importPlanningCardAsGoal}
              refreshGoalFromPlanning={sv.refreshGoalFromPlanning}
              addGoalChecklistItem={sv.addGoalChecklistItem}
              toggleGoalChecklistItem={sv.toggleGoalChecklistItem}
              removeGoalChecklistItem={sv.removeGoalChecklistItem}
            />
          )}
        </div>
      )}

      <MediaDock
        dockMediaItems={sv.dockMediaItems}
        dockCollapsed={sv.dockCollapsed}
        setDockCollapsed={sv.setDockCollapsed}
        youtubePlaying={sv.youtubePlaying}
        youtubeDockRefs={sv.youtubeDockRefs}
        audioRefs={sv.audioRefs}
        sendYoutubeCommand={sv.sendYoutubeCommand}
      />
    </div>
  )
}
