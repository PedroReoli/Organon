import React from 'react'
import type { LicenseStatus } from '../types/license'
import { STATUS_LABELS } from '../types/license'

const colorMap: Record<LicenseStatus, string> = {
  trial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
}

interface Props {
  status: LicenseStatus
}

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorMap[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
