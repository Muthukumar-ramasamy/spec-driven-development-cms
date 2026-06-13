import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Link,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useCompany } from '../hooks/useCompany'
import { useCompanyMutations } from '../hooks/useCompanyMutations'
import { CompanyForm } from '../components/CompanyForm'

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAuth()
  const [tab, setTab] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const { data: response, isLoading, isError } = useCompany(id ?? '')
  const { remove } = useCompanyMutations()

  const company = response?.data

  function handleDelete() {
    if (!id) return
    remove.mutate(id, {
      onSuccess: () => navigate('/companies'),
    })
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError || !company) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Company not found or failed to load.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/companies" color="inherit" underline="hover">
          Companies
        </Link>
        <Typography color="text.primary">{company.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          {company.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Edit />} onClick={() => setFormOpen(true)}>
            Edit
          </Button>
          {authUser?.role === 'admin' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left panel — company details */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Company information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <InfoRow label="Website" value={company.website} />
            <InfoRow label="Industry" value={company.industry} />
            <InfoRow
              label="Employees"
              value={
                company.employeeCount != null
                  ? company.employeeCount.toLocaleString()
                  : null
              }
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Owner
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={company.ownerName} size="small" variant="outlined" />
              </Box>
            </Box>

            {company.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {company.notes}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right panel — related data tabs */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined">
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Contacts" />
              <Tab label="Activities" />
              <Tab label="Notes" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {tab === 0 && (
                <Typography color="text.secondary" variant="body2">
                  {company.contacts.length === 0
                    ? 'No contacts linked to this company yet.'
                    : `${company.contacts.length} contact(s) linked.`}
                </Typography>
              )}
              {tab === 1 && (
                <Typography color="text.secondary" variant="body2">
                  No activities yet.
                </Typography>
              )}
              {tab === 2 && (
                <Typography color="text.secondary" variant="body2">
                  No notes yet.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <CompanyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editCompany={company}
      />
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Box>
  )
}
