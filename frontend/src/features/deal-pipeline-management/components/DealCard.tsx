import { useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { SwapHoriz } from '@mui/icons-material'
import { DealStatusChip } from './DealStatusChip'
import { useDealMutations } from '../hooks/useDealMutations'
import type { Deal, PipelineStage } from '../types'

interface Props {
  deal: Deal
  stages: PipelineStage[]
  onClick: () => void
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
}

export function DealCard({ deal, stages, onClick }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const { update } = useDealMutations()

  const otherStages = stages
    .filter((s) => s.id !== deal.stageId)
    .sort((a, b) => a.displayOrder - b.displayOrder)

  function handleMoveClick(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  function handleMenuClose() {
    setAnchorEl(null)
  }

  function handleMoveTo(stageId: string) {
    update.mutate({ id: deal.id, data: { stageId } })
    handleMenuClose()
  }

  return (
    <Card
      elevation={1}
      sx={{
        maxWidth: '100%',
        mb: 1,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ borderRadius: 'inherit' }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, mr: 1 }}>
              {deal.title}
            </Typography>
            <Tooltip title="Move to stage">
              <IconButton
                size="small"
                onClick={handleMoveClick}
                sx={{ mt: -0.5, mr: -0.5 }}
              >
                <SwapHoriz fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatValue(deal.value)}
          </Typography>

          <Box sx={{ mt: 1 }}>
            <DealStatusChip status={deal.status} />
          </Box>
        </CardContent>
      </CardActionArea>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {otherStages.length === 0 ? (
          <MenuItem disabled>No other stages</MenuItem>
        ) : (
          otherStages.map((stage) => (
            <MenuItem key={stage.id} onClick={() => handleMoveTo(stage.id)}>
              {stage.name}
            </MenuItem>
          ))
        )}
      </Menu>
    </Card>
  )
}
