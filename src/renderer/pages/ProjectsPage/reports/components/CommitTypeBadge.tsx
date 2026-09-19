import React from 'react'
import { getCommitTypeStyle } from '../constants/commitTypes'

export interface CommitTypeBadgeProps {
  type: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
  style?: React.CSSProperties
}

export const CommitTypeBadge: React.FC<CommitTypeBadgeProps> = ({
  type,
  size = 'sm',
  className = '',
  style: customStyle,
}) => {
  const tStyle = getCommitTypeStyle(type)

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[9.5px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-1',
  }

  return (
    <span
      className={`inline-block font-mono font-bold uppercase rounded border text-center shrink-0 ${sizeClasses[size]} ${className}`}
      style={{
        background: tStyle.bg,
        color: tStyle.color,
        borderColor: tStyle.border,
        ...customStyle,
      }}
    >
      {type}
    </span>
  )
}
