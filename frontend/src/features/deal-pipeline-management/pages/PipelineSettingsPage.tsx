import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'
import { useAuth } from '../../../hooks/useAuth'
import { useStages } from '../hooks/useStages'
import { useDeals } from '../hooks/useDeals'
import { PipelineSettingsPanel } from '../components/PipelineSettingsPanel'

export default function PipelineSettingsPage() {
  const authUser = useAuth()
  const navigate = useNavigate()

  const { data: stages = [], isLoading: stagesLoading, isError: stagesError } = useStages()
  const { data: openDealsData, isLoading: dealsLoading } = useDeals({ status: 'open', limit: 500 })

  const openDealCountByStage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const deal of openDealsData?.data ?? []) {
      counts[deal.stageId] = (counts[deal.stageId] ?? 0) + 1
    }
    return counts
  }, [openDealsData])

  // Access guard — non-admins see a denial message (not redirected, keeping it as hidden element)
  if (authUser?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Only administrators can manage pipeline settings.
        </Alert>
      </Box>
    )
  }

  const isLoading = stagesLoading || dealsLoading

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Pipeline Settings
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {stagesError && !isLoading && (
        <Alert severity="error">Failed to load pipeline stages. Please refresh and try again.</Alert>
      )}

      {!isLoading && !stagesError && (
        <PipelineSettingsPanel
          stages={stages}
          openDealCountByStage={openDealCountByStage}
        />
      )}
    </Box>
  )
}
