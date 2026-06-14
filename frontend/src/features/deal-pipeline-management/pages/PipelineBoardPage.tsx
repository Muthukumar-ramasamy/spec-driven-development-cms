import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { TrendingUp } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useDeals } from '../hooks/useDeals'
import { useStages } from '../hooks/useStages'
import { PipelineBoard } from '../components/PipelineBoard'
import { DealForm } from '../components/DealForm'
import { MarkLostModal } from '../components/MarkLostModal'
import { DealStatusChip } from '../components/DealStatusChip'
import type { Deal } from '../types'

type StatusTab = 'open' | 'won' | 'lost'

export default function PipelineBoardPage() {
  const authUser = useAuth()
  const navigate = useNavigate()

  const [statusTab, setStatusTab] = useState<StatusTab>('open')
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>(undefined)
  const [markLostDealId, setMarkLostDealId] = useState<string | null>(null)

  const isManagerOrAbove =
    authUser?.role === 'admin' || authUser?.role === 'manager'

  const filters = {
    status: statusTab,
    ownerId: ownerFilter || undefined,
    limit: 500,
  }

  const { data, isLoading, isError, refetch } = useDeals(filters)
  const { data: stages = [], isLoading: stagesLoading, isError: stagesError } = useStages()

  const deals = data?.data ?? []

  function handleAddDeal(stageId: string) {
    setDefaultStageId(stageId)
    setEditDeal(null)
    setFormOpen(true)
  }

  function handleDealClick(deal: Deal) {
    navigate(`/deals/${deal.id}`)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditDeal(null)
    setDefaultStageId(undefined)
  }

  const isLoadingAny = isLoading || stagesLoading
  const isErrorAny = isError || stagesError

  return (
    <Box sx={{ p: 3 }}>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Pipeline
        </Typography>
        <Button
          variant="contained"
          startIcon={<TrendingUp />}
          onClick={() => {
            setDefaultStageId(stages[0]?.id)
            setEditDeal(null)
            setFormOpen(true)
          }}
        >
          New Deal
        </Button>
      </Box>

      {/* Filter row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        {isManagerOrAbove && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Owner</InputLabel>
            <Select
              label="Owner"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <MenuItem value="">All owners</MenuItem>
            </Select>
          </FormControl>
        )}

        <Tabs
          value={statusTab}
          onChange={(_, val: StatusTab) => setStatusTab(val)}
          sx={{ ml: isManagerOrAbove ? 0 : 0 }}
        >
          <Tab label="Open" value="open" />
          <Tab label="Won" value="won" />
          <Tab label="Lost" value="lost" />
        </Tabs>
      </Box>

      {/* States */}
      {isLoadingAny && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isErrorAny && !isLoadingAny && (
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }>
          Failed to load pipeline data. Please try again.
        </Alert>
      )}

      {!isLoadingAny && !isErrorAny && statusTab === 'open' && (
        <>
          {deals.length === 0 && stages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No pipeline stages configured yet.</Typography>
            </Box>
          ) : (
            <PipelineBoard
              stages={stages}
              deals={deals}
              onAddDeal={handleAddDeal}
              onDealClick={handleDealClick}
            />
          )}
        </>
      )}

      {!isLoadingAny && !isErrorAny && (statusTab === 'won' || statusTab === 'lost') && (
        <>
          {deals.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                No {statusTab} deals found.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>{statusTab === 'won' ? 'Won at' : 'Lost at'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <TableCell>{deal.title}</TableCell>
                      <TableCell>
                        {deal.value !== null
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            }).format(deal.value)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <DealStatusChip status={deal.status} />
                      </TableCell>
                      <TableCell>{deal.ownerName}</TableCell>
                      <TableCell>
                        {statusTab === 'won' && deal.wonAt
                          ? new Date(deal.wonAt).toLocaleDateString()
                          : statusTab === 'lost' && deal.lostAt
                          ? new Date(deal.lostAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Modals */}
      <DealForm
        open={formOpen}
        onClose={handleFormClose}
        editDeal={editDeal}
        defaultStageId={defaultStageId}
      />

      {markLostDealId && (
        <MarkLostModal
          open={!!markLostDealId}
          dealId={markLostDealId}
          onClose={() => setMarkLostDealId(null)}
        />
      )}
    </Box>
  )
}
