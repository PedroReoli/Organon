/**
 * WebZeroKnowledgeGuide.tsx — Guia de Acesso Web Zero-Knowledge & Gerador de Pareamento por QR Code.
 * Exibido no módulo de Configurações no Desktop.
 */

import React, { useState } from 'react'
import { generateQRPairingPayload } from '@utils/e2eeCrypto'
import { Button } from '@shared/components/primitives'

export const WebZeroKnowledgeGuide: React.FC = () => {
  const [pairingData, setPairingData] = useState<{ sessionToken: string; qrData: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePairing = async () => {
    setIsGenerating(true)
    try {
      const result = await generateQRPairingPayload()
      setPairingData(result)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
            Acesso Web Zero-Knowledge & Criptografia E2EE
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Acesse seus dados em qualquer navegador com privacidade total (a VPS não lê o seu conteúdo).
          </span>
        </div>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
          }}
        >
          AES-256-GCM Ativo
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Opção A */}
        <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px' }}>
          <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Opção A: Login Direto no Navegador</strong>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '8px 0' }}>
            Acesse o endereço da sua VPS (ex: <code>https://app.organon.com.br</code>) e entre com seu e-mail e Senha Mestra. A chave de decifragem é calculada exclusivamente no seu navegador.
          </p>
        </div>

        {/* Opção B */}
        <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px' }}>
          <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Opção B: Pareamento Instantâneo via QR Code</strong>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '8px 0' }}>
            Escaneie o QR Code com o aplicativo Mobile autenticado para liberar a sessão no navegador sem precisar digitar senhas.
          </p>
          <Button size="sm" variant="secondary" onClick={handleGeneratePairing} disabled={isGenerating}>
            {isGenerating ? 'Gerando...' : 'Gerar QR Code de Pareamento'}
          </Button>
        </div>
      </div>

      {pairingData && (
        <div
          style={{
            background: 'var(--color-background-secondary)',
            border: '1px dashed var(--color-primary)',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
            Código de Sessão Criptografada (Validade: 5 min)
          </span>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: '6px', color: 'var(--color-primary)' }}>
            {pairingData.sessionToken}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Abra o app no celular e confirme o acesso no menu "Conectar Navegador".
          </span>
        </div>
      )}
    </div>
  )
}
