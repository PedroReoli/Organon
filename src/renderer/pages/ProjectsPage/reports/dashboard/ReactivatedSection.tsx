import React from 'react'

interface ReactivatedSectionProps {
  reactivated: string[]
}

export const ReactivatedSection: React.FC<ReactivatedSectionProps> = ({ reactivated }) => {
  if (reactivated.length === 0) return null
  return (
    <div className="rp-section">
      <h3 className="rp-section-title">Projetos que voltaram</h3>
      <div className="rp-reactivated-list">
        {reactivated.map(name => (
          <span key={name} className="rp-reactivated-badge">{name}</span>
        ))}
      </div>
    </div>
  )
}
