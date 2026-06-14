import { Box, Button, Divider, Paper, Typography } from '@mui/material'
import { AddCircleOutlined } from '@mui/icons-material'
import { DealCard } from './DealCard'
import type { Deal, PipelineStage } from '../types'

interface Props {
  stages: PipelineStage[]
  deals: Deal[]
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: Deal) => void
}

export function PipelineBoard({ stages, deals, onAddDeal, onDealClick }: Props) {
  const sortedStages = stages
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        pb: 2,
        alignItems: 'flex-start',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      {sortedStages.map((stage) => {
        const stageDeals = deals.filter(
          (d) => d.stageId === stage.id && d.status === 'open',
        )

        return (
          <Paper
            key={stage.id}
            variant="outlined"
            sx={{
              minWidth: 260,
              maxWidth: 280,
              flexShrink: 0,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'grey.50',
            }}
          >
            {/* Column header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {stage.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'grey.200',
                  px: 1,
                  py: 0.25,
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                {stageDeals.length}
              </Typography>
            </Box>

            <Divider />

            {/* Deals list */}
            <Box sx={{ px: 1.5, py: 1.5, flex: 1 }}>
              {stageDeals.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', py: 2 }}
                >
                  No deals in this stage
                </Typography>
              ) : (
                stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    stages={stages}
                    onClick={() => onDealClick(deal)}
                  />
                ))
              )}
            </Box>

            {/* Add deal button */}
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              <Button
                fullWidth
                size="small"
                startIcon={<AddCircleOutlined fontSize="small" />}
                onClick={() => onAddDeal(stage.id)}
                sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
              >
                Add deal
              </Button>
            </Box>
          </Paper>
        )
      })}
    </Box>
  )
}
