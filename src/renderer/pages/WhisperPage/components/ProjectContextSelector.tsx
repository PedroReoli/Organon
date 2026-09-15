import { ProjectContextConfig } from '../../../services/meetingIntelligence/types'
const defaults: ProjectContextConfig = { enabled: false, name: '', path: '', allowWebResearch: true, automaticResearch: true, watchChanges: false, systemAudio: true, readOnly: true, agentProviderId: 'codex' }
export function ProjectContextSelector({ config, onChange }: { config?: ProjectContextConfig; onChange: (config: ProjectContextConfig) => void }) {
  const value = { ...defaults, ...config }
  const update = (patch: Partial<ProjectContextConfig>) => onChange({ ...value, ...patch })
  const chooseFolder = async () => {
    const folder = await window.electronAPI?.projectSelectFolder?.()
    if (folder) update({ path: folder.path, name: folder.name, enabled: true })
  }
  return <section style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 10, display: 'grid', gap: 10 }} aria-label="Contexto da reunião">
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <strong>Contexto dos agentes</strong>
      <button onClick={() => void chooseFolder()}>{value.path ? 'Trocar pasta' : 'Vincular pasta'}</button>
      {value.path && <button onClick={() => update({ enabled: false, path: '', name: '', watchChanges: false })}>Desvincular</button>}
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflowWrap: 'anywhere' }}>{value.path || 'Pesquisa web disponível sem vincular uma pasta.'}</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
      <label><input type="checkbox" checked={value.automaticResearch} onChange={event => update({ automaticResearch: event.target.checked })} /> Pesquisar perguntas da conversa</label>
      <label><input type="checkbox" checked={value.allowWebResearch} onChange={event => update({ allowWebResearch: event.target.checked })} /> Usar internet</label>
      <label><input type="checkbox" checked={value.enabled} disabled={!value.path} onChange={event => update({ enabled: event.target.checked })} /> Analisar pasta</label>
      <label><input type="checkbox" checked={value.watchChanges} disabled={!value.enabled} onChange={event => update({ watchChanges: event.target.checked })} /> Acompanhar alterações</label>
      <label><input type="checkbox" checked={value.systemAudio} onChange={event => update({ systemAudio: event.target.checked })} /> Capturar áudio do sistema</label>
    </div>
    <small style={{ color: 'var(--color-text-muted)' }}>Os agentes recebem perguntas e trechos selecionados para análise. A pasta permanece somente para leitura.</small>
  </section>
}
