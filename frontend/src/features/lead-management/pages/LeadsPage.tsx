import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { MoreVert, TrendingUpOutlined } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useLeads } from '../hooks/useLeads'
import { useLeadMutations } from '../hooks/useLeadMutations'
import { LeadStatusBadge } from '../components/LeadStatusBadge'
import { LeadForm } from '../components/LeadForm'
import { LeadDetailDrawer } from '../components/LeadDetailDrawer'
import { ConvertToDealModal } from '../components/ConvertToDealModal'
import type { Lead } from '../types'

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

interface RowMenuProps {
  lead: Lead
  isAdmin: boolean
  onEdit: (lead: Lead) => void
  onConvert: (lead: Lead) => void
  onDisqualify: (lead: Lead) => void
  onDelete: (leadId: string) => void
}

function LeadRowMenu({
  lead,
  isAdmin,
  onEdit,
  onConvert,
  onDisqualify,
  onDelete,
}: RowMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const isConverted = lead.status === 'converted'
  const isDisqualified = lead.status === 'disqualified'

  function handleOpen(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  function handleClose() {
    setAnchorEl(null)
  }

  function wrap(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      fn()
      handleClose()
    }
  }

  return (
    <>
      <Tooltip title="More actions">
        <IconButton size="small" onClick={handleOpen}>
          <MoreVert fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={wrap(() => onEdit(lead))}>Edit</MenuItem>

        {!isConverted && !isDisqualified && (
          <MenuItem onClick={wrap(() => onConvert(lead))}>Convert to Deal</MenuItem>
        )}

        {!isDisqualified && !isConverted && (
          <MenuItem onClick={wrap(() => onDisqualify(lead))}>Disqualify</MenuItem>
        )}

        {isAdmin && (
          <MenuItem onClick={wrap(() => onDelete(lead.id))} sx={{ color: 'error.main' }}>
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default function LeadsPage() {
  const authUser = useAuth()
  const isAdmin = authUser?.role === 'admin'
  const canFilterByOwner =
    authUser?.role === 'admin' || authUser?.role === 'manager'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('new,contacted')
  const [ownerFilter, setOwnerFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)

  const filters = {
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    ownerId: ownerFilter || undefined,
  }

  const { data, isLoading, isError } = useLeads(filters)
  const { update, remove } = useLeadMutations()

  function handleEdit(lead: Lead) {
    setEditLead(lead)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditLead(null)
  }

  function handleConvert(lead: Lead) {
    setConvertLead(lead)
  }

  function handleDisqualify(lead: Lead) {
    update.mutate({ id: lead.id, data: { status: 'disqualified' } })
  }

  function handleDelete(leadId: string) {
    remove.mutate(leadId)
  }

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
          Leads
        </Typography>
        <Button
          variant="contained"
          startIcon={<TrendingUpOutlined />}
          onClick={() => setFormOpen(true)}
        >
          New lead
        </Button>
      </Box>

      {/* Filters row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search leads…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          sx={{ width: 260 }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          >
            <MenuItem value="new,contacted">Open (New + Contacted)</MenuItem>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="contacted">Contacted</MenuItem>
            <MenuItem value="qualified">Qualified</MenuItem>
            <MenuItem value="disqualified">Disqualified</MenuItem>
            <MenuItem value="converted">Converted</MenuItem>
          </Select>
        </FormControl>

        {canFilterByOwner && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Owner</InputLabel>
            <Select
              label="Owner"
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value)
                setPage(1)
              }}
            >
              <MenuItem value="">All owners</MenuItem>
              <MenuItem value={authUser?.sub ?? ''}>Mine</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load leads. Please try again.
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No leads found.</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setFormOpen(true)}>
            Add your first lead
          </Button>
        </Box>
      )}

      {/* Table */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Owner</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 56 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((lead) => (
                  <TableRow
                    key={lead.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setDetailLeadId(lead.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {lead.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(lead.value)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {lead.source ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={lead.ownerName} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(lead.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <LeadRowMenu
                        lead={lead}
                        isAdmin={isAdmin}
                        onEdit={handleEdit}
                        onConvert={handleConvert}
                        onDisqualify={handleDisqualify}
                        onDelete={handleDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Lead create/edit form drawer */}
      <LeadForm open={formOpen} onClose={handleFormClose} editLead={editLead} />

      {/* Lead detail drawer */}
      <LeadDetailDrawer
        leadId={detailLeadId}
        open={!!detailLeadId}
        onClose={() => setDetailLeadId(null)}
      />

      {/* Convert to deal modal */}
      {convertLead && (
        <ConvertToDealModal
          open={!!convertLead}
          leadId={convertLead.id}
          leadTitle={convertLead.title}
          onClose={() => setConvertLead(null)}
        />
      )}
    </Box>
  )
}
