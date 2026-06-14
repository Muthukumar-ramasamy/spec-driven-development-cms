import { Chip } from '@mui/material'
import type { Lead } from '../types'

interface Props {
  status: Lead['status']
}

export function LeadStatusBadge({ status }: Props) {
  switch (status) {
    case 'new':
      return (
        <Chip label="New" color="info" size="small" />
      )
    case 'contacted':
      return (
        <Chip label="Contacted" color="warning" size="small" />
      )
    case 'qualified':
      return (
        <Chip label="Qualified" color="success" size="small" />
      )
    case 'disqualified':
      return (
        <Chip label="Disqualified" color="default" size="small" />
      )
    case 'converted':
      return (
        <Chip
          label="Converted"
          size="small"
          sx={{ bgcolor: 'purple', color: 'white' }}
        />
      )
    default:
      return <Chip label={status} size="small" />
  }
}
