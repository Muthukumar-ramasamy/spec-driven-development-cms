import { Chip } from '@mui/material'
import type { Deal } from '../types'

interface Props {
  status: Deal['status']
  size?: 'small' | 'medium'
}

const STATUS_CONFIG: Record<Deal['status'], { label: string; color: 'info' | 'success' | 'error' }> = {
  open: { label: 'Open', color: 'info' },
  won: { label: 'Won', color: 'success' },
  lost: { label: 'Lost', color: 'error' },
}

export function DealStatusChip({ status, size = 'small' }: Props) {
  const { label, color } = STATUS_CONFIG[status]
  return <Chip label={label} color={color} size={size} />
}
