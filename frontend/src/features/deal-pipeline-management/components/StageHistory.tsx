import { Box, Divider, Typography } from '@mui/material'
import type { DealStageHistory, PipelineStage } from '../types'

interface Props {
  history: DealStageHistory[]
  stages: PipelineStage[]
}

function resolveStage(stages: PipelineStage[], id: string | null): string {
  if (!id) return 'Initial placement'
  return stages.find((s) => s.id === id)?.name ?? id
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StageHistory({ history, stages }: Props) {
  if (history.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        No stage history yet.
      </Typography>
    )
  }

  return (
    <Box>
      {history.map((entry, index) => {
        const fromLabel = entry.fromStageId
          ? resolveStage(stages, entry.fromStageId)
          : 'Initial placement'
        const toLabel = resolveStage(stages, entry.toStageId)
        const isInitial = !entry.fromStageId

        return (
          <Box key={entry.id}>
            <Box sx={{ py: 1.5 }}>
              {isInitial ? (
                <Typography variant="body2">
                  Placed in <strong>{toLabel}</strong> on {formatDate(entry.movedAt)}
                </Typography>
              ) : (
                <Typography variant="body2">
                  Moved from <strong>{fromLabel}</strong> → <strong>{toLabel}</strong> on{' '}
                  {formatDate(entry.movedAt)}
                </Typography>
              )}
            </Box>
            {index < history.length - 1 && <Divider />}
          </Box>
        )
      })}
    </Box>
  )
}
