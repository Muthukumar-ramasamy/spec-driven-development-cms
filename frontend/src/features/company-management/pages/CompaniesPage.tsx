import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Pagination,
  Paper,
  TableContainer,
  TextField,
  Typography,
} from '@mui/material'
import { BusinessOutlined } from '@mui/icons-material'
import { useCompanies } from '../hooks/useCompanies'
import { useCompanyMutations } from '../hooks/useCompanyMutations'
import { CompanyTable } from '../components/CompanyTable'
import { CompanyForm } from '../components/CompanyForm'
import type { Company } from '../types'

export default function CompaniesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)

  const filters = {
    page,
    limit: 20,
    search: search || undefined,
  }

  const { data, isLoading, isError } = useCompanies(filters)
  const { remove } = useCompanyMutations()

  function handleEdit(company: Company) {
    setEditCompany(company)
    setFormOpen(true)
  }

  function handleDelete(companyId: string) {
    remove.mutate(companyId)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditCompany(null)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Companies
        </Typography>
        <Button
          variant="contained"
          startIcon={<BusinessOutlined />}
          onClick={() => setFormOpen(true)}
        >
          New company
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          sx={{ width: 280 }}
        />
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load companies. Please try again.
        </Alert>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No companies found.</Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => setFormOpen(true)}
          >
            Add your first company
          </Button>
        </Box>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <CompanyTable
              companies={data.data}
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

      <CompanyForm
        open={formOpen}
        onClose={handleFormClose}
        editCompany={editCompany}
      />
    </Box>
  )
}
