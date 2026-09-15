import React from 'react'

interface ViewLoadingSkeletonProps {
  title?: string
  message?: string
}

export const ViewLoadingSkeleton: React.FC<ViewLoadingSkeletonProps> = ({
  title = 'Carregando módulo...',
  message = 'Otimizando recursos e preparando a interface',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '400px',
        padding: '40px',
        color: 'var(--color-text-muted)',
        animation: 'dashboardCardFadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px',
        }}
      />
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
        {message}
      </div>
    </div>
  )
}
