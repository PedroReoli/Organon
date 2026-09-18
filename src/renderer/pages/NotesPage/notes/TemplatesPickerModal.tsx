/**
 * TemplatesPickerModal — modal para escolher template ao criar nova nota.
 *
 * Mostra builtin templates + templates customizados do usuario.
 * Substitui variaveis ({{date}}, {{time}}, {{title}}) ao confirmar.
 *
 * Upgrade 10c.
 */

import React, { useMemo, useState } from 'react'
import type { NoteTemplate } from '@types'
import { BUILTIN_NOTE_TEMPLATES } from '@types'
import { Button } from '@shared/components/primitives'
import { Modal } from '@/components/ui/Modal'

const ICON_MAP: Record<string, React.ReactNode> = {
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  rocket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
}

function renderTemplateIcon(icon: string | undefined): React.ReactNode {
  if (!icon) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
  if (ICON_MAP[icon]) return ICON_MAP[icon]
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}

interface TemplatesPickerModalProps {
  userTemplates: NoteTemplate[]
  defaultTitle?: string
  onClose: () => void
  onSelect: (title: string, content: string) => void
}

function applyVariables(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const TemplatesPickerModal: React.FC<TemplatesPickerModalProps> = ({
  userTemplates,
  defaultTitle = '',
  onClose,
  onSelect,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState(defaultTitle)

  const allTemplates = useMemo(
    () => [...BUILTIN_NOTE_TEMPLATES, ...userTemplates],
    [userTemplates],
  )

  const selected = useMemo(
    () => allTemplates.find((t) => t.id === selectedId),
    [allTemplates, selectedId],
  )

  const handleConfirm = () => {
    const finalTitle = title.trim() || 'Nova nota'
    if (!selected) {
      onSelect(finalTitle, '<p></p>')
      return
    }
    const vars: Record<string, string> = {
      date: todayLabel(),
      time: nowTime(),
      title: finalTitle,
    }
    if (selected.variables) {
      for (const v of selected.variables) {
        if (!(v.key in vars)) vars[v.key] = v.defaultValue ?? ''
      }
    }
    const content = applyVariables(selected.content, vars)
    onSelect(finalTitle, content)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nova nota a partir de template"
      className="notes-templates-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm}>Criar nota</Button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Título</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome da nota"
          autoFocus
        />
      </div>

      <div className="notes-templates-grid">
        <button
          type="button"
          className={`notes-template-card ${selectedId === null ? 'is-active' : ''}`}
          onClick={() => setSelectedId(null)}
        >
          <span className="notes-template-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></span>
          <span className="notes-template-name">Em branco</span>
          <span className="notes-template-desc">Nota vazia</span>
        </button>
        {allTemplates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`notes-template-card ${selectedId === t.id ? 'is-active' : ''}`}
            onClick={() => setSelectedId(t.id)}
          >
            <span className="notes-template-icon">{renderTemplateIcon(t.icon)}</span>
            <span className="notes-template-name">{t.name}</span>
            {t.description && <span className="notes-template-desc">{t.description}</span>}
            {t.category && <span className="notes-template-category">{t.category}</span>}
          </button>
        ))}
      </div>
    </Modal>
  )
}
