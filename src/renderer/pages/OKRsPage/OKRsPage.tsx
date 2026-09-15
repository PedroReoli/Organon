import React, { useState } from 'react'

export interface KeyResult {
  id: string
  title: string
  current: number
  target: number
  unit: string
}

export interface Objective {
  id: string
  title: string
  category: 'Produtividade' | 'Engenharia' | 'Financeiro' | 'Pessoal'
  period: string
  keyResults: KeyResult[]
}

const INITIAL_OBJECTIVES: Objective[] = [
  {
    id: 'okr-1',
    title: 'Manter Alta Velocidade de Entrega e Saúde do Código',
    category: 'Engenharia',
    period: 'Q3 2026',
    keyResults: [
      { id: 'kr-1', title: 'Concluir tarefas de Sprints', current: 14, target: 20, unit: 'cards' },
      { id: 'kr-2', title: 'Zero bad commits nos repositórios ativos', current: 45, target: 47, unit: 'repos limpos' },
    ],
  },
  {
    id: 'okr-2',
    title: 'Consolidar Reserva Financeira e Metas de Economia',
    category: 'Financeiro',
    period: 'Ano 2026',
    keyResults: [
      { id: 'kr-3', title: 'Atingir meta de saldo investido', current: 12500, target: 20000, unit: 'BRL' },
      { id: 'kr-4', title: 'Manter despesas mensais sob controle', current: 4200, target: 5000, unit: 'BRL/mês' },
    ],
  },
]

export const OKRsPage: React.FC = () => {
  const [objectives, setObjectives] = useState<Objective[]>(INITIAL_OBJECTIVES)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Objective['category']>('Produtividade')
  const [newPeriod, setNewPeriod] = useState('Q3 2026')
  const [krTitle, setKrTitle] = useState('')
  const [krTarget, setKrTarget] = useState('')
  const [krUnit, setKrUnit] = useState('unidades')

  const calcProgress = (krs: KeyResult[]): number => {
    if (krs.length === 0) return 0
    const sum = krs.reduce((acc, kr) => {
      const p = Math.min(100, Math.round((kr.current / kr.target) * 100))
      return acc + (isNaN(p) ? 0 : p)
    }, 0)
    return Math.round(sum / krs.length)
  }

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !krTitle.trim() || !krTarget.trim()) return

    const newOkr: Objective = {
      id: `okr-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      period: newPeriod.trim(),
      keyResults: [
        {
          id: `kr-${Date.now()}`,
          title: krTitle.trim(),
          current: 0,
          target: parseFloat(krTarget) || 10,
          unit: krUnit.trim() || 'unidades',
        },
      ],
    }

    setObjectives((prev) => [newOkr, ...prev])
    setNewTitle('')
    setKrTitle('')
    setKrTarget('')
    setShowAddModal(false)
  }

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--color-background, #12121a)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text, #ffffff)', margin: 0 }}>
            OKRs & Metas de Longo Prazo
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Objetivos estratégicos e resultados-chave alimentados pelas métricas reais do aplicativo
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary, #6366f1)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Novo Objetivo (OKR)
        </button>
      </div>

      {/* Lista de Objetivos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {objectives.map((okr) => {
          const totalProg = calcProgress(okr.keyResults)
          return (
            <div
              key={okr.id}
              style={{
                padding: 20,
                borderRadius: 14,
                background: 'var(--color-surface, #1e1e2d)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Topo do Card de Objetivo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(99,102,241,0.15)',
                      color: 'var(--color-primary, #6366f1)',
                    }}
                  >
                    {okr.category}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{okr.period}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Progresso Geral:</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{totalProg}%</span>
                </div>
              </div>

              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {okr.title}
              </h2>

              {/* Barra de Progresso do Objetivo */}
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalProg}%`,
                    background: 'var(--color-primary, #6366f1)',
                    borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Key Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>
                  RESULTADOS-CHAVE (KEY RESULTS)
                </span>
                {okr.keyResults.map((kr) => {
                  const krProg = Math.min(100, Math.round((kr.current / kr.target) * 100))
                  return (
                    <div
                      key={kr.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                          {kr.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 99,
                              background: 'rgba(255,255,255,0.06)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${krProg}%`,
                                background: '#10b981',
                                borderRadius: 99,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{krProg}%</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                          {kr.current} / {kr.target}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block' }}>
                          {kr.unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Add OKR */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <form
            onSubmit={handleAddObjective}
            style={{
              width: 440,
              padding: 24,
              borderRadius: 14,
              background: 'var(--color-surface, #1e1e2d)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Cadastrar Novo Objetivo (OKR)
            </h2>

            <input
              type="text"
              placeholder="Título do Objetivo (ex: Expandir Cobertura do Sistema)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                style={{
                  flex: 1,
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              >
                <option value="Produtividade">Produtividade</option>
                <option value="Engenharia">Engenharia</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Pessoal">Pessoal</option>
              </select>

              <input
                type="text"
                placeholder="Período (ex: Q4 2026)"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                style={{
                  width: 120,
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
              PRIMEIRO RESULTADO-CHAVE (KEY RESULT)
            </span>

            <input
              type="text"
              placeholder="Título do KR (ex: Concluir 30 tarefas)"
              value={krTitle}
              onChange={(e) => setKrTitle(e.target.value)}
              required
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                placeholder="Meta Numérica"
                value={krTarget}
                onChange={(e) => setKrTarget(e.target.value)}
                required
                style={{
                  flex: 1,
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              />

              <input
                type="text"
                placeholder="Unidade (ex: cards)"
                value={krUnit}
                onChange={(e) => setKrUnit(e.target.value)}
                style={{
                  width: 120,
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Salvar Objetivo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
