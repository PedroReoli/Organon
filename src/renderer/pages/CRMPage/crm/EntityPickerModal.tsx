/**
 * EntityPickerModal — modal generico para escolher uma entidade (nota,
 * evento, projeto, etc) e vincular ao contato CRM.
 *
 * Substitui os 3 prompts() de "selecione (numero)" do CRMContactModal.
 * Mostra busca + lista filtrada + click pra confirmar.
 *
 * Upgrade 03.
 */

import React, { useMemo, useState } from 'react'
import { Button, Input } from '@shared/components/primitives'

export interface EntityPickerItem {
  id: string
  label: string
  /** Linha secundaria opcional. */
  sublabel?: string
}

interface EntityPickerModalProps {
  title: string
  emptyMessage?: string
  items: EntityPickerItem[]
  /** Ids ja vinculados — exibidos com badge "vinculado" e nao selecionaveis. */
  alreadyLinkedIds?: Set<string>
  onClose: () => void
  onSelect: (id: string) => void
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export const EntityPickerModal: React.FC<EntityPickerModalProps> = ({
  title,
  emptyMessage = 'Nada disponivel para vincular.',
  items,
  alreadyLinkedIds,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return items
    return items.filter(
      (i) =>
        normalize(i.label).includes(q) ||
        (i.sublabel ? normalize(i.sublabel).includes(q) : false),
    )
  }, [items, query])

  const handlePick = (id: string) => {
    if (alreadyLinkedIds?.has(id)) return
    onSelect(id)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal crm-entity-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          {items.length === 0 ? (
            <p className="crm-entity-picker-empty">{emptyMessage}</p>
          ) : (
            <>
              <div className="form-group">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  fullWidth
                  autoFocus
                />
              </div>

              <div className="crm-entity-picker-list">
                {filtered.length === 0 ? (
                  <p className="crm-entity-picker-empty">Nenhum resultado.</p>
                ) : (
                  filtered.map((item) => {
                    const isLinked = alreadyLinkedIds?.has(item.id) ?? false
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`crm-entity-picker-item ${isLinked ? 'is-linked' : ''}`}
                        onClick={() => handlePick(item.id)}
                        disabled={isLinked}
                      >
                        <span className="crm-entity-picker-label">{item.label}</span>
                        {item.sublabel && (
                          <span className="crm-entity-picker-sublabel">
                            {item.sublabel}
                          </span>
                        )}
                        {isLinked && (
                          <span className="crm-entity-picker-badge">vinculado</span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        <footer className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </footer>
      </div>
    </div>
  )
}
