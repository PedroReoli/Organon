import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { LicenseWithDetails, LicenseActivation } from '../types/license'
import { MODULES, PLANS, STATUS_LABELS } from '../types/license'
import StatusBadge from '../components/StatusBadge'

interface Props {
  licenseId: string
  onBack: () => void
}

type Tab = 'overview' | 'modules' | 'activations'

export default function LicenseDetailView({ licenseId, onBack }: Props) {
  const [license, setLicense] = useState<LicenseWithDetails | null>(null)
  const [activations, setActivations] = useState<LicenseActivation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Local module state for editing
  const [moduleEdits, setModuleEdits] = useState<Record<string, boolean>>({})
  const [moduleDirty, setModuleDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [licRes, actRes] = await Promise.all([
        api.getLicense(licenseId),
        api.getActivations(licenseId),
      ])
      setLicense(licRes.license)
      setActivations(actRes.activations)

      const initial: Record<string, boolean> = {}
      for (const mod of MODULES) {
        const ent = licRes.license.entitlements.find((e) => e.moduleKey === mod)
        initial[mod] = ent?.enabled ?? false
      }
      setModuleEdits(initial)
      setModuleDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar licença')
    } finally {
      setLoading(false)
    }
  }, [licenseId])

  useEffect(() => {
    load()
  }, [load])

  function notify(msg: string, isError = false) {
    if (isError) {
      setActionError(msg)
      setTimeout(() => setActionError(null), 4000)
    } else {
      setActionSuccess(msg)
      setTimeout(() => setActionSuccess(null), 3000)
    }
  }

  async function handleSuspend() {
    if (!confirm('Suspender esta licença?')) return
    setSaving(true)
    try {
      await api.suspendLicense(licenseId)
      notify('Licença suspensa.')
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('Revogar esta licença? Esta ação não pode ser desfeita facilmente.')) return
    setSaving(true)
    try {
      await api.revokeLicense(licenseId)
      notify('Licença revogada.')
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetActivations() {
    if (!confirm('Resetar todas as ativações desta licença?')) return
    setSaving(true)
    try {
      await api.resetActivations(licenseId)
      notify('Ativações resetadas.')
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveModules() {
    setSaving(true)
    try {
      await api.updateEntitlements(licenseId, moduleEdits)
      notify('Módulos salvos.')
      setModuleDirty(false)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro', true)
    } finally {
      setSaving(false)
    }
  }

  function toggleModule(key: string) {
    setModuleEdits((prev) => ({ ...prev, [key]: !prev[key] }))
    setModuleDirty(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Carregando...
      </div>
    )
  }

  if (error || !license) {
    return (
      <div className="flex-1 p-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-2">
          ← Voltar
        </button>
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">
          {error ?? 'Licença não encontrada.'}
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'modules', label: 'Módulos' },
    { id: 'activations', label: `Ativações (${activations.length})` },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-slate-100">{license.name}</h1>
              <StatusBadge status={license.status} />
            </div>
            <p className="font-mono text-sm text-blue-400">{license.code}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {PLANS[license.planNumber] ?? `Plano ${license.planNumber}`} · Cliente {license.customerNumber} · Licença {license.licenseNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {license.status !== 'suspended' && license.status !== 'revoked' && (
            <button
              onClick={handleSuspend}
              disabled={saving}
              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-600/30 text-orange-400 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Suspender
            </button>
          )}
          {license.status !== 'revoked' && (
            <button
              onClick={handleRevoke}
              disabled={saving}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Revogar
            </button>
          )}
          <button
            onClick={load}
            disabled={saving}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-4 bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-green-400 text-sm">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-700/50">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <InfoCard label="Status" value={STATUS_LABELS[license.status]} />
            <InfoCard label="Código" value={license.code} mono />
            <InfoCard label="Plano" value={`${license.planNumber} — ${PLANS[license.planNumber] ?? 'Desconhecido'}`} />
            <InfoCard label="Máx. Dispositivos" value={String(license.maxDevices)} />
          </div>
          <div className="space-y-4">
            <InfoCard label="Emitida em" value={fmtDate(license.issuedAt)} />
            <InfoCard label="Expira em" value={fmtDate(license.expiresAt)} />
            <InfoCard label="Grace até" value={license.graceUntil ? fmtDate(license.graceUntil) : '—'} />
            <InfoCard label="Última validação" value={license.lastValidationAt ? fmtDate(license.lastValidationAt) : '—'} />
            <InfoCard label="Criada em" value={fmtDate(license.createdAt)} />
          </div>

          <div className="col-span-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ações de Ativação</h3>
            <button
              onClick={handleResetActivations}
              disabled={saving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              Resetar Ativações
            </button>
          </div>
        </div>
      )}

      {/* Modules Tab */}
      {tab === 'modules' && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MODULES.map((mod) => (
              <label
                key={mod}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={moduleEdits[mod] ?? false}
                  onChange={() => toggleModule(mod)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-slate-300 font-mono">{mod}</span>
              </label>
            ))}
          </div>
          {moduleDirty && (
            <button
              onClick={handleSaveModules}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar Módulos'}
            </button>
          )}
        </div>
      )}

      {/* Activations Tab */}
      {tab === 'activations' && (
        <div>
          {activations.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma ativação registrada.</p>
          ) : (
            <div className="border border-slate-700/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Dispositivo</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Plataforma</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Versão</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Último acesso</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Ativado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {activations.map((a) => (
                    <tr key={a.id} className={!a.isActive ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 text-slate-200">{a.deviceName}</td>
                      <td className="px-4 py-3 text-slate-400">{a.platform}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{a.appVersion}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${a.isActive ? 'text-green-400' : 'text-slate-500'}`}>
                          {a.isActive ? 'Ativo' : a.deactivationReason ?? 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{fmtDate(a.lastSeenAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


    </div>
  )
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
