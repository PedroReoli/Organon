import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { License } from '../types/license'
import { PLANS } from '../types/license'
import StatusBadge from '../components/StatusBadge'

interface Props {
  onSelect: (id: string) => void
  refreshKey: number
}

export default function LicensesView({ onSelect, refreshKey }: Props) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listLicenses()
      setLicenses(res.licenses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar licenças')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const filtered = licenses.filter((l) => {
    const q = search.toLowerCase()
    return (
      l.code.includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.customerNumber.includes(q)
    )
  })

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Licenças</h1>
          <p className="text-sm text-slate-400 mt-0.5">{licenses.length} licença{licenses.length !== 1 ? 's' : ''} cadastrada{licenses.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Atualizar
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, nome ou cliente..."
          className="w-full max-w-sm bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {loading && (
        <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-slate-500 text-sm py-8 text-center">
          {search ? 'Nenhuma licença encontrada.' : 'Nenhuma licença cadastrada ainda.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Dispositivos</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Expira em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((license) => (
                <tr
                  key={license.id}
                  onClick={() => onSelect(license.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs">{license.code}</td>
                  <td className="px-4 py-3 text-slate-200">{license.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {PLANS[license.planNumber] ?? `Plano ${license.planNumber}`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={license.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{license.maxDevices}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(license.expiresAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
