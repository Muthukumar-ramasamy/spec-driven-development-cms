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
import { useContact } from '../hooks/useContact'
import { useContactMutations } from '../hooks/useContactMutations'
import { ContactForm } from '../components/ContactForm'
import { NotesFeed } from '../../../features/notes/components/NotesFeed'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAuth()
  const [tab, setTab] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const { data: response, isLoading, isError } = useContact(id ?? '')
  const contact = response?.data
  const { remove } = useContactMutations()

  function handleDelete() {
    if (!id) return
    remove.mutate(id, {
      onSuccess: () => navigate('/contacts'),
    })
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError || !contact) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Contact not found or failed to load.</Alert>
      </Box>
    )
  }

  const fullName = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}`

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/contacts" color="inherit" underline="hover">
          Contacts
        </Link>
        <Typography color="text.primary">{fullName}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          {fullName}
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
        {/* Left panel — contact details */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contact information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Phone" value={contact.phone} />
            <InfoRow label="Job title" value={contact.jobTitle} />
            <InfoRow label="Company" value={contact.companyName} />
            <InfoRow label="LinkedIn" value={contact.linkedinUrl} />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Owner
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={contact.ownerName} size="small" variant="outlined" />
              </Box>
            </Box>

            {contact.source && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Source
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={contact.source.replace('_', ' ')} size="small" />
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right panel — related data tabs */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined">
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Deals" />
              <Tab label="Activities" />
              <Tab label="Notes" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {tab === 0 && (
                <Typography color="text.secondary" variant="body2">
                  No deals yet.
                </Typography>
              )}
              {tab === 1 && (
                <Typography color="text.secondary" variant="body2">
                  No activities yet.
                </Typography>
              )}
              {tab === 2 && id && (
                <NotesFeed recordType="contact" recordId={id} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editContact={contact}
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
