
import type { Settings } from '@types'
import type { PingDiagnostics } from '../../../../api/organon'
import { Button } from '@shared/components/primitives'
import { WebZeroKnowledgeGuide } from '../../components/WebZeroKnowledgeGuide'


interface SyncErrorRow {
  raw: string; resource: string; batchIdx: string; totalBatches: string
  status: string; count: string; message: string
}

interface CloudSectionProps {
  activeSection:                string
  settings:                     Settings
  isConfigured?:                boolean
  userLoggedIn?:                boolean
  syncStatus?:                  'idle' | 'pending' | 'syncing' | 'synced' | 'error'
  syncError?:                   string | null
  onSync?:                      () => void
  pingStatus:                   'idle' | 'testing' | 'ok' | 'error'
  pingReport:                   PingDiagnostics | null
  handlePing:                   () => void
  syncErrorSummary:             string
  syncErrorTime:                string
  syncErrorRows:                SyncErrorRow[]
  handleDownloadSyncErrorReport:() => void
}

export const CloudSection = ({
  activeSection, settings, isConfigured, userLoggedIn,
  syncStatus, syncError, onSync,
  pingStatus, pingReport, handlePing,
  syncErrorSummary, syncErrorTime, syncErrorRows, handleDownloadSyncErrorReport,
}: CloudSectionProps) => (
  <>
  <style>{`@keyframes settings-sync-pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
  <section className={`settings-section ${activeSection !== 'cloud' ? 'settings-section-hidden' : ''}`}>
    <div className="settings-section-header">
      <h3>Nuvem</h3>
    </div>

    <div className="settings-data-grid">
      {/* Conectividade */}
      <div className="settings-data-card">
        <h4>Conectividade</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: !isConfigured ? '#6b7280'
              : pingStatus === 'ok'    ? '#22c55e'
              : pingStatus === 'error' ? '#ef4444'
              : '#6b7280',
          }} />
          <span className="settings-help-text" style={{ margin: 0 }}>
            {!isConfigured
              ? 'API não configurada (defina uma URL válida da API)'
              : !userLoggedIn
                ? 'API configurada. Faça login para habilitar sincronização na nuvem.'
              : pingStatus === 'ok'      ? 'Conectado à API Organon'
              : pingStatus === 'error'   ? (pingReport?.message || 'Sem conexão com a API')
              : pingStatus === 'testing' ? 'Testando...'
              : 'Clique em "Testar" para verificar'}
          </span>
        </div>
        <p className="settings-help-text" style={{ marginBottom: 12 }}>
          API: {settings.apiBaseUrl || 'https://reolicodeapi.com'}
        </p>
        <Button variant="secondary" onClick={handlePing} disabled={pingStatus === 'testing' || !isConfigured}>
          {pingStatus === 'testing' ? 'Testando...' : 'Testar conexão'}
        </Button>
        {pingStatus === 'error' && pingReport && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)' }}>
            <p className="settings-help-text" style={{ margin: 0, color: 'var(--color-danger)' }}>
              Relatorio: {pingReport.message}
            </p>
            <p className="settings-help-text" style={{ margin: '4px 0 0 0' }}>
              Base: {pingReport.baseUrl} | Horario: {new Date(pingReport.checkedAt).toLocaleString('pt-BR')}
            </p>
            {pingReport.attempts.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pingReport.attempts.map((attempt, idx: number) => (
                  <p key={`${attempt.path}-${idx}`} className="settings-help-text" style={{ margin: 0 }}>
                    - {attempt.path} [{attempt.withAuth ? 'auth' : 'publico'}]: {
                      attempt.skipped
                        ? `pulado (${attempt.error || 'sem token'})`
                        : attempt.ok
                          ? `ok (HTTP ${attempt.status ?? '-'})`
                          : `falhou (${attempt.status ? `HTTP ${attempt.status}` : (attempt.error || 'sem resposta')})`
                    }
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sincronização automática */}
      <div className="settings-data-card">
        <h4>Sincronização automática</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: syncStatus === 'synced'  ? '#22c55e'
              : syncStatus === 'error'            ? '#ef4444'
              : syncStatus === 'syncing'          ? 'var(--color-primary)'
              : syncStatus === 'pending'          ? '#f97316'
              : '#6b7280',
            animation: (syncStatus === 'syncing' || syncStatus === 'pending') ? 'settings-sync-pulse 1.2s ease-in-out infinite' : 'none',
          }} />
          <span className="settings-help-text" style={{ margin: 0 }}>
            {(!syncStatus || syncStatus === 'idle') && (isConfigured && userLoggedIn ? 'Aguardando alterações' : 'Inativo')}
            {syncStatus === 'pending'  && 'Alterações pendentes — sincronizando em breve...'}
            {syncStatus === 'syncing'  && 'Sincronizando dados...'}
            {syncStatus === 'synced'   && 'Tudo sincronizado'}
            {syncStatus === 'error'    && 'Erro na última sincronização'}
          </span>
          {syncStatus === 'pending' && onSync && (
            <Button type="button" variant="secondary" size="sm" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={onSync}>
              Sincronizar agora
            </Button>
          )}
        </div>
        <p className="settings-help-text">
          {!userLoggedIn
            ? 'Sem login: os dados ficam apenas no dispositivo local.'
            : syncStatus === 'pending'
              ? 'Há alterações locais aguardando envio. Clique em "Sincronizar agora" para não esperar.'
              : 'Dados são enviados automaticamente 10 segundos após cada alteração.'}
        </p>

        {syncStatus === 'error' && syncError && (
          <div style={{ marginTop: 8, borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 2 }}>
                  {syncErrorSummary || 'Erro na sincronização'}
                </div>
                {syncErrorTime && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{syncErrorTime}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {onSync && (
                  <Button type="button" variant="secondary" size="sm" onClick={onSync}>
                    Tentar novamente
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={handleDownloadSyncErrorReport}>
                  Baixar .txt
                </Button>
              </div>
            </div>
            {syncErrorRows.map((row, i) => (
              <div key={i} style={{ padding: '8px 14px', borderTop: '1px solid rgba(239,68,68,0.12)', display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {row.resource ? (
                  <>
                    <span style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{row.resource}</span>
                    <span style={{ background: 'rgba(251,146,60,0.18)', color: '#fb923c', borderRadius: 4, padding: '2px 7px', fontSize: 11, flexShrink: 0 }}>HTTP {row.status}</span>
                    <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '2px 7px', fontSize: 11, flexShrink: 0, color: 'var(--color-text-muted)' }}>
                      {row.count} {parseInt(row.count) === 1 ? 'item' : 'itens'} · lote {row.batchIdx}/{row.totalBatches}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.45, flex: '1 1 180px', marginTop: 1 }}>{row.message}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.raw}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <WebZeroKnowledgeGuide />
  </section>
  </>
)
