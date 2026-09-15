import { useState } from 'react'

interface FinancialSectionProps {
  activeSection: string
  monthlyIncome: number
  monthlySpendingLimit: number
  currency: string
  onSave: (data: { monthlyIncome: number; monthlySpendingLimit: number; currency: string }) => void
}

const CURRENCIES = ['BRL', 'USD', 'EUR']

export const FinancialSection = ({
  activeSection, monthlyIncome, monthlySpendingLimit, currency, onSave,
}: FinancialSectionProps) => {
  const [income, setIncome] = useState(String(monthlyIncome || ''))
  const [limit, setLimit]   = useState(String(monthlySpendingLimit || ''))
  const [curr, setCurr]     = useState(currency || 'BRL')
  const [saved, setSaved]   = useState(false)

  if (activeSection !== 'financial') return null

  const handleSave = () => {
    onSave({
      monthlyIncome: parseFloat(income.replace(',', '.')) || 0,
      monthlySpendingLimit: parseFloat(limit.replace(',', '.')) || 0,
      currency: curr,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Financeiro</h3>
        <p className="settings-hint">Renda, limites e moeda padrao.</p>
      </div>

      <div className="settings-grid">
        <div className="settings-field">
          <label className="settings-field-label">Renda mensal base</label>
          <input
            className="settings-input"
            type="text"
            value={income}
            onChange={e => setIncome(e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Teto de gastos mensais</label>
          <input
            className="settings-input"
            type="text"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Moeda</label>
          <select
            className="settings-input"
            value={curr}
            onChange={e => setCurr(e.target.value)}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="settings-section-actions">
        <button className="settings-btn-primary" onClick={handleSave}>
          {saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>
    </section>
  )
}
