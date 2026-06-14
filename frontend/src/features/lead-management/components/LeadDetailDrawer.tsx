import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { Close, Edit, TrendingDown, SwapHoriz } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useLead } from '../hooks/useLead'
import { useLeadMutations } from '../hooks/useLeadMutations'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadForm } from './LeadForm'
import { ConvertToDealModal } from './ConvertToDealModal'
import { getApiErrorMessage } from '../../../lib/api'

interface Props {
  leadId: string | null
  open: boolean
  onClose: () => void
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export function LeadDetailDrawer({ leadId, open, onClose }: Props) {
  const authUser = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isError } = useLead(leadId)
  const { update, remove } = useLeadMutations()

  const lead = data?.data

  const isAdmin = authUser?.role === 'admin'
  const isConverted = lead?.status === 'converted'
  const isDisqualified = lead?.status === 'disqualified'

  function handleDisqualify() {
    if (!lead) return
    setActionError(null)
    update.mutate(
      { id: lead.id, data: { status: 'disqualified' } },
      {
        onError: (err: unknown) => setActionError(getApiErrorMessage(err)),
      },
    )
  }

  function handleDelete() {
    if (!lead) return
    setActionError(null)
    remove.mutate(lead.id, {
      onSuccess: onClose,
      onError: (err: unknown) => setActionError(getApiErrorMessage(err)),
    })
  }

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 520, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : lead ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {lead.title}
                </Typography>
                <LeadStatusBadge status={lead.status} />
              </Box>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {lead && (
              <>
                <Tooltip title="Edit lead">
                  <IconButton size="small" onClick={() => setEditOpen(true)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>

                {!isConverted && !isDisqualified && (
                  <Tooltip title="Convert to deal">
                    <IconButton size="small" onClick={() => setConvertOpen(true)}>
                      <SwapHoriz fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {!isDisqualified && !isConverted && (
                  <Tooltip title="Disqualify lead">
                    <IconButton
                      size="small"
                      onClick={handleDisqualify}
                      disabled={update.isPending}
                    >
                      <TrendingDown fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {isAdmin && (
                  <Tooltip title="Delete lead">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={handleDelete}
                      disabled={remove.isPending}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}

            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose} sx={{ ml: 0.5 }}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {isError && (
            <Alert severity="error" sx={{ m: 3 }}>
              Failed to load lead details.
            </Alert>
          )}

          {actionError && (
            <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
              {actionError}
            </Alert>
          )}

          {!isLoading && !isError && lead && (
            <>
              {/* Lead info section */}
              <Box sx={{ px: 3, py: 2.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: 'block', mb: 1.5 }}
                >
                  Lead info
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Value
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(lead.value)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Source
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {lead.source ?? '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Owner
                    </Typography>
                    <Chip label={lead.ownerName} size="small" variant="outlined" />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(lead.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Converted section */}
              {isConverted && (
                <>
                  <Divider />
                  <Box sx={{ px: 3, py: 2.5 }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ display: 'block', mb: 1.5 }}
                    >
                      Converted
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Converted on
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatDate(lead.convertedAt)}
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!lead.convertedDealId}
                        href={lead.convertedDealId ? `/deals/${lead.convertedDealId}` : undefined}
                        component={lead.convertedDealId ? 'a' : 'button'}
                      >
                        View Deal
                      </Button>
                    </Box>
                  </Box>
                </>
              )}

              <Divider />

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v: number) => setActiveTab(v)}
                  sx={{ px: 2 }}
                >
                  <Tab label="Activities" />
                  <Tab label="Notes" />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No activities yet.
                  </Typography>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No notes yet.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </Drawer>

      {lead && (
        <>
          <LeadForm
            open={editOpen}
            onClose={() => setEditOpen(false)}
            editLead={lead}
          />
          <ConvertToDealModal
            open={convertOpen}
            leadId={lead.id}
            leadTitle={lead.title}
            onClose={() => setConvertOpen(false)}
          />
        </>
      )}
    </>
  )
}
