import React, { useState } from 'react'
import { api } from '../api/client'
import { MODULES, PLANS } from '../types/license'

interface Props {
  onCreated: (id: string) => void
  onCancel: () => void
}

function padLeft(value: string, length: number): string {
  return value.padStart(length, '0')
}

function buildCode(planNumber: string, customerNumber: string, licenseNumber: string): string {
  return (
    padLeft(planNumber, 2) +
    padLeft(customerNumber, 6) +
    padLeft(licenseNumber, 2)
  )
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function oneYearFromNow(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

const DEFAULT_MODULES: Record<string, boolean> = Object.fromEntries(
  MODULES.map((m) => [m, false])
)

export default function CreateLicenseView({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [planNumber, setPlanNumber] = useState('02')
  const [customerNumber, setCustomerNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('01')
  const [maxDevices, setMaxDevices] = useState(2)
  const [issuedAt, setIssuedAt] = useState(today())
  const [expiresAt, setExpiresAt] = useState(oneYearFromNow())
  const [graceUntil, setGraceUntil] = useState('')
  const [modules, setModules] = useState<Record<string, boolean>>(DEFAULT_MODULES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewCode = customerNumber
    ? buildCode(planNumber, customerNumber, licenseNumber)
    : '??????????'

  function toggleModule(key: string) {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerNumber.trim()) {
      setError('Número do cliente é obrigatório.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.createLicense({
        name: name.trim() || previewCode,
        planNumber: padLeft(planNumber, 2),
        customerNumber: padLeft(customerNumber, 6),
        licenseNumber: padLeft(licenseNumber, 2),
        maxDevices,
        issuedAt: new Date(issuedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        graceUntil: graceUntil ? new Date(graceUntil).toISOString() : undefined,
        modules,
      })
      onCreated(res.license.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar licença')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Nova Licença</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Código gerado:{' '}
              <span className="font-mono text-blue-400">{previewCode}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Identificação
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Plano</label>
                <select
                  value={planNumber}
                  onChange={(e) => setPlanNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(PLANS).map(([num, label]) => (
                    <option key={num} value={num}>
                      {num} — {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Número do Cliente <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000001"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nº da Licença</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="01"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Licença</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Licença ${previewCode}`}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </section>

          {/* Validade */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Validade
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Emitida em</label>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Expira em</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Grace até (opcional)</label>
                <input
                  type="date"
                  value={graceUntil}
                  onChange={(e) => setGraceUntil(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 max-w-xs">
              <label className="block text-xs font-medium text-slate-400 mb-1">Máx. Dispositivos</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </section>

          {/* Módulos */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Módulos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((mod) => (
                <label
                  key={mod}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={modules[mod] ?? false}
                    onChange={() => toggleModule(mod)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-300 font-mono">{mod}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Criando...' : 'Criar Licença'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
