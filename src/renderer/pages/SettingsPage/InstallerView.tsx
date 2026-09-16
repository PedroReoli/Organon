import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { ThemeName } from '@types'
import { THEMES, THEME_LABELS } from '@types'
import { applyTheme, isElectron } from '@utils'

interface InstallerViewProps {
  onComplete: () => void
}

interface InstallerStatus {
  completed: boolean
  needsMigration: boolean
  currentPath: string
  suggestedPath: string
  summary: Record<string, number>
}

type InstallerStep = 'welcome' | 'location' | 'protection' | 'theme' | 'review' | 'running' | 'complete'
const THEMES_PER_PAGE = 2

const SUMMARY_LABELS: Record<string, string> = {
  notes: 'Notas', noteFolders: 'Pastas', cards: 'Cards',
  calendarEvents: 'Eventos', projects: 'Projetos', meetings: 'Reuniões',
}

interface ThemeCardProps {
  themeName: ThemeName
  isSelected: boolean
  onSelect: () => void
}

const ThemeCard = ({ themeName, isSelected, onSelect }: ThemeCardProps) => {
  const theme = THEMES[themeName]
  return (
    <button
      className={`theme-card ${isSelected ? 'theme-card-selected' : ''}`}
      onClick={onSelect}
      style={{
        '--preview-bg': theme.background,
        '--preview-surface': theme.surface,
        '--preview-primary': theme.primary,
        '--preview-text': theme.text,
      } as React.CSSProperties}
    >
      <div className="theme-card-preview">
        <div className="theme-preview-sidebar" />
        <div className="theme-preview-content">
          <div className="theme-preview-header" />
          <div className="theme-preview-cards"><div className="theme-preview-card" /><div className="theme-preview-card" /></div>
        </div>
      </div>
      <div className="theme-card-label">{THEME_LABELS[themeName]}</div>
      {isSelected && <div className="theme-card-check" aria-label="Tema selecionado" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} /></div>}
    </button>
  )
}

const StorageTree = () => (
  <div className="installer-storage-tree" aria-label="Estrutura da pasta Organon">
    <div className="tree-root">Organon</div>
    <div><strong>Dados</strong><span>Notas, calendário, projetos, estudos e financeiro</span></div>
    <div><strong>Anexos</strong><span>Imagens, áudios e arquivos</span></div>
    <div><strong>Backups</strong><span>Diários, semanais, mensais e manuais</span></div>
    <div><strong>Exportações</strong><span>Arquivos gerados pelo aplicativo</span></div>
    <div><strong>_sistema</strong><span>Índices e verificações internas</span></div>
  </div>
)

export const InstallerView = ({ onComplete }: InstallerViewProps) => {
  const themeNames = Object.keys(THEMES) as ThemeName[]
  const [step, setStep] = useState<InstallerStep>('welcome')
  const [status, setStatus] = useState<InstallerStatus | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('dark-default')
  const [themePageStart, setThemePageStart] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ markdownFiles?: number; recoveredFiles?: number; warnings?: string[] } | null>(null)
  const maxThemePageStart = Math.max(0, Math.floor((themeNames.length - 1) / THEMES_PER_PAGE) * THEMES_PER_PAGE)
  const visibleThemes = themeNames.slice(themePageStart, themePageStart + THEMES_PER_PAGE)

  useEffect(() => {
    if (!isElectron()) return
    window.electronAPI.getInstallerStatus()
      .then(next => { setStatus(next); setDataDir(next.suggestedPath) })
      .catch(err => setError(`Não foi possível analisar a instalação: ${String(err)}`))
  }, [])

  const handleSelectFolder = async () => {
    if (!isElectron()) return
    const selected = await window.electronAPI.selectDataDir()
    if (selected) setDataDir(selected)
  }

  const handleFinish = async () => {
    if (!isElectron()) { onComplete(); return }
    setStep('running')
    setError(null)
    try {
      const migration = await window.electronAPI.completeInstaller(dataDir, selectedTheme)
      if (!migration.success) {
        setError(migration.error ?? 'A migração não passou na validação.')
        setStep('review')
        return
      }
      setResult(migration)
      setStep('complete')
    } catch (err) {
      setError(String(err))
      setStep('review')
    }
  }

  const changeThemePage = (direction: -1 | 1) => {
    setThemePageStart(current => Math.max(0, Math.min(maxThemePageStart, current + direction * THEMES_PER_PAGE)))
  }

  const renderSummary = () => (
    <div className="installer-data-summary">
      {Object.entries(status?.summary ?? {}).map(([key, value]) => (
        <div key={key}><strong>{value}</strong><span>{SUMMARY_LABELS[key] ?? key}</span></div>
      ))}
    </div>
  )

  return (
    <div className="installer-container">
      <div className="installer-content">
        {step === 'welcome' && (
          <div className="installer-step">
            <div className="installer-kicker">Armazenamento local v2</div>
            <h1>{status?.needsMigration ? 'Vamos proteger seus dados' : 'Prepare seu espaço Organon'}</h1>
            <p>O Organon agora separa seus arquivos pessoais dos arquivos internos do aplicativo.</p>
            {status?.needsMigration && <><div className="installer-current-path">Origem preservada: <strong>{status.currentPath}</strong></div>{renderSummary()}</>}
            {error && <div className="installer-error">{error}</div>}
            <button className="btn btn-primary installer-btn" onClick={() => setStep('location')} disabled={!status}>Continuar</button>
          </div>
        )}

        {step === 'location' && (
          <div className="installer-step">
            <div className="installer-kicker">1 de 4 · Local</div>
            <h2>Uma pasta dedicada e legível</h2>
            <p>Você poderá abrir, copiar e inspecionar seus dados diretamente pelo Explorer.</p>
            <StorageTree />
            <div className="installer-path-card">
              <span>Pasta escolhida</span><strong>{dataDir || 'Nenhuma pasta selecionada'}</strong>
              <button className="btn btn-secondary" onClick={handleSelectFolder}>Escolher outra pasta</button>
            </div>
            <div className="installer-nav"><button className="btn btn-secondary" onClick={() => setStep('welcome')}>Voltar</button><button className="btn btn-primary" onClick={() => setStep('protection')} disabled={!dataDir}>Próximo</button></div>
          </div>
        )}

        {step === 'protection' && (
          <div className="installer-step">
            <div className="installer-kicker">2 de 4 · Proteção</div>
            <h2>Recuperação em várias camadas</h2>
            <div className="installer-protection-grid">
              <div><strong>Antes de atualizar</strong><span>Cópia completa antes da migração.</span></div>
              <div><strong>Todos os dias</strong><span>7 versões diárias rotativas.</span></div>
              <div><strong>Longo prazo</strong><span>8 semanais e 12 mensais.</span></div>
              <div><strong>Backup manual</strong><span>Nunca removido automaticamente.</span></div>
            </div>
            <p className="installer-note">Uma restauração só será aceita quando índices, notas e hashes estiverem íntegros.</p>
            <div className="installer-nav"><button className="btn btn-secondary" onClick={() => setStep('location')}>Voltar</button><button className="btn btn-primary" onClick={() => setStep('theme')}>Próximo</button></div>
          </div>
        )}

        {step === 'theme' && (
          <div className="installer-step">
            <div className="installer-kicker">3 de 4 · Aparência</div>
            <h2>Escolha um tema</h2>
            <div className="installer-theme-grid"><div className="theme-carousel-wrapper installer-theme-carousel-wrapper">
              <button className="theme-carousel-arrow" onClick={() => changeThemePage(-1)} disabled={themePageStart === 0} aria-label="Temas anteriores">‹</button>
              <div className="installer-theme-page"><div className="theme-carousel-track installer-theme-track">{visibleThemes.map(themeName => <ThemeCard key={themeName} themeName={themeName} isSelected={selectedTheme === themeName} onSelect={() => { setSelectedTheme(themeName); applyTheme(THEMES[themeName]) }} />)}</div></div>
              <button className="theme-carousel-arrow" onClick={() => changeThemePage(1)} disabled={themePageStart >= maxThemePageStart} aria-label="Próximos temas">›</button>
            </div></div>
            <div className="installer-nav"><button className="btn btn-secondary" onClick={() => setStep('protection')}>Voltar</button><button className="btn btn-primary" onClick={() => setStep('review')}>Revisar</button></div>
          </div>
        )}

        {step === 'review' && (
          <div className="installer-step">
            <div className="installer-kicker">4 de 4 · Confirmação</div>
            <h2>{status?.needsMigration ? 'Pronto para copiar e validar' : 'Pronto para criar'}</h2>
            <div className="installer-review"><div><span>Destino</span><strong>{dataDir}</strong></div><div><span>Tema</span><strong>{THEME_LABELS[selectedTheme]}</strong></div><div><span>Método</span><strong>Cópia segura; origem preservada</strong></div></div>
            {error && <div className="installer-error">{error}</div>}
            <div className="installer-nav"><button className="btn btn-secondary" onClick={() => setStep('theme')}>Voltar</button><button className="btn btn-primary" onClick={handleFinish}>{status?.needsMigration ? 'Migrar e validar' : 'Criar e validar'}</button></div>
          </div>
        )}

        {step === 'running' && <div className="installer-step installer-running"><div className="installer-spinner" /><h2>Protegendo seus dados</h2><p>Copiando arquivos, validando a integridade e instalando o pacote local do Whisper. Não feche o Organon.</p></div>}

        {step === 'complete' && (
          <div className="installer-step">
            <div className="installer-success-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={28} /></div><div className="installer-kicker">Migração validada</div><h2>Seus dados estão protegidos</h2>
            <p>{result?.markdownFiles ?? 0} notas foram materializadas como arquivos legíveis. {result?.recoveredFiles ? `${result.recoveredFiles} arquivo(s) adicional(is) foram preservados em _Recuperados.` : ''}</p>
            {!!result?.warnings?.length && <div className="installer-warning">{result.warnings.length} aviso(s) foram registrados, sem interromper a migração.</div>}
            <button className="btn btn-primary installer-btn" onClick={onComplete}>Abrir o Organon</button>
          </div>
        )}
      </div>
      {!['running', 'complete'].includes(step) && <div className="installer-progress">{['location', 'protection', 'theme', 'review'].map(item => <div key={item} className={`installer-progress-step ${step === item ? 'active' : ''}`} />)}</div>}
    </div>
  )
}
