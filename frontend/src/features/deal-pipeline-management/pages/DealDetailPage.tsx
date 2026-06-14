import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  CheckCircleOutlined,
  CancelOutlined,
  Delete,
  Edit,
} from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useDeal } from '../hooks/useDeal'
import { useStages } from '../hooks/useStages'
import { useDealMutations } from '../hooks/useDealMutations'
import { DealStatusChip } from '../components/DealStatusChip'
import { DealForm } from '../components/DealForm'
import { MarkLostModal } from '../components/MarkLostModal'
import { StageHistory } from '../components/StageHistory'
import { NotesFeed } from '../../../features/notes/components/NotesFeed'
import type { Deal } from '../types'

type TabValue = 'history' | 'activities' | 'notes'

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAuth()

  const [activeTab, setActiveTab] = useState<TabValue>('history')
  const [editOpen, setEditOpen] = useState(false)
  const [markWonConfirmOpen, setMarkWonConfirmOpen] = useState(false)
  const [markLostOpen, setMarkLostOpen] = useState(false)

  const { data: dealDetail, isLoading, isError } = useDeal(id)
  const { data: stages = [] } = useStages()
  const { update, remove, markWon } = useDealMutations()

  const isAdmin = authUser?.role === 'admin'

  function handleStageClick(stageId: string) {
    if (!id) return
    update.mutate({ id, data: { stageId } })
  }

  function handleMarkWon() {
    if (!id) return
    markWon.mutate(id, {
      onSuccess: () => setMarkWonConfirmOpen(false),
    })
  }

  function handleDelete() {
    if (!id) return
    remove.mutate(id, {
      onSuccess: () => navigate('/deals'),
    })
  }

  const sortedStages = stages.slice().sort((a, b) => a.displayOrder - b.displayOrder)

  function formatValue(value: number | null): string {
    if (value === null || value === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError || !dealDetail) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load deal details. The deal may not exist or you may not have access.
        </Alert>
        <Button startIcon={<ArrowBack />} sx={{ mt: 2 }} onClick={() => navigate('/deals')}>
          Back to Pipeline
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left panel — stage selector */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          py: 2,
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ px: 2, mb: 1, display: 'block' }}>
          Pipeline Stage
        </Typography>
        <List disablePadding>
          {sortedStages.map((stage) => (
            <ListItemButton
              key={stage.id}
              selected={stage.id === dealDetail.stageId}
              onClick={() => handleStageClick(stage.id)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.50',
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                },
              }}
            >
              <ListItemText
                primary={stage.name}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        {/* Back button */}
        <Button
          startIcon={<ArrowBack />}
          size="small"
          onClick={() => navigate('/deals')}
          sx={{ mb: 2 }}
        >
          Back to Pipeline
        </Button>

        {/* Deal title and status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {dealDetail.title}
          </Typography>
          <DealStatusChip status={dealDetail.status} size="medium" />
        </Box>

        {/* Key details */}
        <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Value
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {formatValue(dealDetail.value)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Owner
            </Typography>
            <Typography variant="body1">{dealDetail.ownerName}</Typography>
          </Box>
          {dealDetail.expectedCloseDate && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Expected close
              </Typography>
              <Typography variant="body1">
                {new Date(dealDetail.expectedCloseDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
          {dealDetail.lostReason && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Lost reason
              </Typography>
              <Typography variant="body1">{dealDetail.lostReason}</Typography>
            </Box>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setEditOpen(true)}
            size="small"
          >
            Edit
          </Button>

          {dealDetail.status === 'open' && (
            <>
              <Button
                variant="outlined"
                color="success"
                startIcon={<CheckCircleOutlined />}
                onClick={() => setMarkWonConfirmOpen(true)}
                size="small"
              >
                Mark Won
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlined />}
                onClick={() => setMarkLostOpen(true)}
                size="small"
              >
                Mark Lost
              </Button>
            </>
          )}

          {isAdmin && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
              size="small"
            >
              Delete
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v: TabValue) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Stage History" value="history" />
          <Tab label="Activities" value="activities" />
          <Tab label="Notes" value="notes" />
        </Tabs>

        {activeTab === 'history' && (
          <StageHistory history={dealDetail.stageHistory} stages={stages} />
        )}

        {activeTab === 'activities' && (
          <Box sx={{ py: 2 }}>
            <Typography color="text.secondary">
              Activities will be shown here. (Coming soon)
            </Typography>
          </Box>
        )}

        {activeTab === 'notes' && id && (
          <NotesFeed recordType="deal" recordId={id} />
        )}
      </Box>

      {/* Edit deal drawer */}
      <DealForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editDeal={dealDetail as Deal}
      />

      {/* Mark Won confirmation */}
      <Dialog open={markWonConfirmOpen} onClose={() => setMarkWonConfirmOpen(false)}>
        <DialogTitle>Mark Deal as Won</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark <strong>{dealDetail.title}</strong> as Won? This will
            remove it from the open pipeline.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkWonConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleMarkWon}
            color="success"
            variant="contained"
            disabled={markWon.isPending}
            startIcon={markWon.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            Mark as Won
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Lost modal */}
      <MarkLostModal
        open={markLostOpen}
        dealId={dealDetail.id}
        onClose={() => setMarkLostOpen(false)}
      />
    </Box>
  )
}
