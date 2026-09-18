import React from 'react'
import { PendingAction } from './chatbot.types'

interface ChatbotActionCardProps {
  action: PendingAction
  onConfirm: () => void
  onCancel: () => void
}

export const ChatbotActionCard: React.FC<ChatbotActionCardProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const getActionLabel = () => {
    switch (action.type) {
      case 'create_note':
        return 'Ação Solicitada: Criar Nota'
      case 'create_folder':
        return 'Ação Solicitada: Criar Pasta'
      case 'move_note':
        return 'Ação Solicitada: Mover Nota'
      case 'toggle_hub':
        return 'Ação Solicitada: Alternar Hub'
      case 'rename_folder':
        return 'Ação Solicitada: Renomear Pasta'
      case 'update_note':
        return 'Ação Solicitada: Atualizar Nota'
      default:
        return 'Ação Solicitada'
    }
  }

  const getActionTitle = () => {
    switch (action.type) {
      case 'create_note':
        return action.title
      case 'create_folder':
        return action.name
      case 'move_note':
        return action.noteTitle
      case 'toggle_hub':
        return action.folderName
      case 'rename_folder':
        return action.folderName
      case 'update_note':
        return action.title
      default:
        return ''
    }
  }

  const getActionDetails = () => {
    switch (action.type) {
      case 'create_note':
        return action.content ? action.content.slice(0, 100) + '...' : 'Nota vazia'
      case 'create_folder':
        return 'Criar nova pasta no Organon'
      case 'move_note':
        return `Mover para a pasta "${action.folderName}"`
      case 'toggle_hub':
        return action.isHome ? 'Transformar em Hub Central de Navegação' : 'Remover modo Hub Central'
      case 'rename_folder':
        return `Renomear pasta para "${action.newName}"`
      case 'update_note':
        return 'Aplicar alterações no conteúdo da nota'
      default:
        return ''
    }
  }

  return (
    <div
      style={{
        margin: '8px 12px',
        padding: '12px 14px',
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '10px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '0.04em',
        }}
      >
        {getActionLabel()}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          marginTop: '4px',
          color: 'var(--color-text)',
        }}
      >
        {getActionTitle()}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          marginTop: '4px',
          background: 'var(--color-surface)',
          padding: '6px 8px',
          borderRadius: '6px',
        }}
      >
        {getActionDetails()}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: '7px 12px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Confirmar e Executar
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '7px 12px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
