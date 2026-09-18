import React, { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { Modal } from './Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading: externalLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false)
  const loading = externalLoading || internalLoading

  const handleConfirm = async () => {
    try {
      setInternalLoading(true)
      await onConfirm()
    } finally {
      setInternalLoading(false)
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle size={24} style={{ color: 'var(--color-danger, #ef4444)' }} />,
          confirmBg: 'var(--color-danger, #ef4444)',
          confirmHover: '#dc2626',
        }
      case 'warning':
        return {
          icon: <AlertCircle size={24} style={{ color: 'var(--color-warning, #f59e0b)' }} />,
          confirmBg: 'var(--color-warning, #f59e0b)',
          confirmHover: '#d97706',
        }
      case 'primary':
      default:
        return {
          icon: <Info size={24} style={{ color: 'var(--color-primary, #6366f1)' }} />,
          confirmBg: 'var(--color-primary, #6366f1)',
          confirmHover: '#4f46e5',
        }
    }
  }

  const { icon, confirmBg } = getVariantStyles()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="440px"
      showCloseButton={!loading}
      closeOnBackdropClick={!loading}
      closeOnEscape={!loading}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div
          style={{
            flexShrink: 0,
            padding: '10px',
            borderRadius: '12px',
            background: 'var(--color-surface, rgba(255, 255, 255, 0.05))',
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text, #ffffff)',
            }}
          >
            {title}
          </h3>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: 'var(--color-text-muted, #9ca3af)',
            }}
          >
            {description}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '24px',
        }}
      >
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
            background: 'transparent',
            color: 'var(--color-text, #ffffff)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'background 0.2s',
          }}
        >
          {cancelText}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleConfirm}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            background: confirmBg,
            color: '#ffffff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
