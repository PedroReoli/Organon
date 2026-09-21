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
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: '360px',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        animation: 'dashboardCardFadeIn 0.25s ease-out',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          border: '3px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
          marginBottom: '16px',
          boxShadow: '0 0 16px -2px color-mix(in srgb, var(--color-primary) 35%, transparent)',
        }}
      />
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: '6px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          maxWidth: '320px',
          lineHeight: 1.45,
        }}
      >
        {message}
      </div>
    </div>
  )
}

