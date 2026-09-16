import React from 'react'
import { SystemNode, SystemEdge, SystemDesignReviewResult } from '../types/systemDesign.types'
import { Bot, X, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  nodes: SystemNode[]
  edges: SystemEdge[]
}

export const SystemDesignReviewModal: React.FC<Props> = ({ isOpen, onClose, nodes, edges }) => {
  if (!isOpen) return null

  // Análise estática do grafo de arquitetura
  const reviewResult: SystemDesignReviewResult = analyzeArchitecture(nodes, edges)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          color: 'var(--color-text)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>AI System Design Reviewer</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* Pontuação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', borderRadius: '8px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: reviewResult.score >= 80 ? '#22c55e' : reviewResult.score >= 50 ? '#f97316' : '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
              }}
            >
              {reviewResult.score}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>Pontuação de Arquitetura</div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {reviewResult.summary}
              </div>
            </div>
          </div>

          {/* SPOFs */}
          {reviewResult.spofs.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#ef4444', margin: '0 0 8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} />
                <span>SPOFs (Pontos Únicos de Falha)</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text)' }}>
                {reviewResult.spofs.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gargalos */}
          {reviewResult.bottlenecks.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#f97316', margin: '0 0 8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} />
                <span>Gargalos de Escalabilidade</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text)' }}>
                {reviewResult.bottlenecks.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendações */}
          {reviewResult.recommendations.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={15} />
                <span>Recomendações de Resiliência</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--color-text)' }}>
                {reviewResult.recommendations.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Concluir Análise
          </button>
        </div>
      </div>
    </div>
  )
}

function analyzeArchitecture(nodes: SystemNode[], edges: SystemEdge[]): SystemDesignReviewResult {
  const spofs: string[] = []
  const bottlenecks: string[] = []
  const recommendations: string[] = []

  const hasCache = nodes.some(n => n.category === 'cache')
  const hasLB = nodes.some(n => n.type === 'load-balancer' || n.type === 'api-gateway')
  const dbCount = nodes.filter(n => n.category === 'database').length

  if (!hasLB && nodes.filter(n => n.category === 'compute').length > 1) {
    spofs.push('Múltiplos microserviços detectados sem Load Balancer / API Gateway na entrada.')
  }

  if (dbCount === 1) {
    spofs.push('Existe apenas 1 instância de banco de dados (SPOF em caso de queda do nó principal).')
  }

  if (!hasCache) {
    bottlenecks.push('Nenhum Redis/Memcached detectado. Consultas repetitivas sobrecarregarão o banco de dados.')
  }

  if (edges.length === 0 && nodes.length > 1) {
    bottlenecks.push('Componentes isolados no canvas sem conexões estabelecidas.')
  }

  recommendations.push('Adicionar réplica de leitura (Read Replica) para o banco de dados relacional.')
  recommendations.push('Configurar um Rate Limiter e WAF no API Gateway para proteger contra ataques DDoS.')

  let score = 90 - (spofs.length * 20) - (bottlenecks.length * 15)
  if (score < 20) score = 20

  return {
    score,
    summary: score >= 80 ? 'Arquitetura resiliente e bem estruturada com baixa probabilidade de falha.' : 'Arquitetura requer ajustes de alta disponibilidade e desacoplamento.',
    spofs,
    bottlenecks,
    securityAlerts: [],
    recommendations,
  }
}
