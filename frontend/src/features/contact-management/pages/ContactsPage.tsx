import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  TableContainer,
  TextField,
  Typography,
} from '@mui/material'
import { PersonAdd } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useContacts } from '../hooks/useContacts'
import { useContactMutations } from '../hooks/useContactMutations'
import { ContactTable } from '../components/ContactTable'
import { ContactForm } from '../components/ContactForm'
import type { Contact } from '../types'

export default function ContactsPage() {
  const authUser = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)

  const filters = {
    page,
    limit: 20,
    search: search || undefined,
    ownerId: ownerFilter || undefined,
  }

  const { data, isLoading, isError } = useContacts(filters)
  const { remove } = useContactMutations()

  function handleEdit(contact: Contact) {
    setEditContact(contact)
    setFormOpen(true)
  }

  function handleDelete(contactId: string) {
    remove.mutate(contactId)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditContact(null)
  }

  const canFilterByOwner = authUser?.role === 'admin' || authUser?.role === 'manager'

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Contacts
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setFormOpen(true)}
        >
          New contact
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          sx={{ width: 280 }}
        />
        {canFilterByOwner && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Owner</InputLabel>
            <Select
              label="Owner"
              value={ownerFilter}
              onChange={(e) => { setOwnerFilter(e.target.value); setPage(1) }}
            >
              <MenuItem value="">All owners</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load contacts. Please try again.
        </Alert>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No contacts found.</Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => setFormOpen(true)}
          >
            Add your first contact
          </Button>
        </Box>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <ContactTable
              contacts={data.data}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
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

      <ContactForm
        open={formOpen}
        onClose={handleFormClose}
        editContact={editContact}
      />
    </Box>
  )
}
