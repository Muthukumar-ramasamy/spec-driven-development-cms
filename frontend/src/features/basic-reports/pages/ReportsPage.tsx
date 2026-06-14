import { useState } from 'react'
import { Box, Container, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material'
import { useAuth } from '../../../hooks/useAuth'
import { DateRangePicker } from '../components/DateRangePicker'
import { DealsReportSection } from '../components/DealsReportSection'
import { PipelineValueSection } from '../components/PipelineValueSection'
import { ActivitiesReportSection } from '../components/ActivitiesReportSection'
import { LeadsBySourceSection } from '../components/LeadsBySourceSection'
import type { ReportsFilters } from '../types'

function defaultFilters(): ReportsFilters {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  const start = new Date(today)
  start.setDate(today.getDate() - 29)
  const startDate = start.toISOString().split('T')[0]
  return { startDate, endDate }
}

export default function ReportsPage() {
  const user = useAuth()
  const [filters, setFilters] = useState<ReportsFilters>(defaultFilters)

  // For sales_rep role the backend silently overrides ownerId to their own ID.
  // The UI never exposes an ownerId picker to sales_rep — role-restricted UI is hidden, not disabled.
  const canFilterByRep =
    user !== null && (user.role === 'admin' || user.role === 'manager')

  // Build the effective filters to pass to each section.
  // For sales_rep, we deliberately do NOT pass an ownerId — the backend enforces scoping.
  const effectiveFilters: ReportsFilters = canFilterByRep
    ? filters
    : { startDate: filters.startDate, endDate: filters.endDate }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Reports
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {user?.role === 'sales_rep'
            ? 'Showing your own data.'
            : 'Showing all data for your organisation.'}
        </Typography>
      </Box>

      {/* Shared filter controls */}
      <Box mb={4} p={3} sx={{ backgroundColor: 'grey.50', borderRadius: 2 }}>
        <DateRangePicker filters={filters} onChange={setFilters} />
        {canFilterByRep && (
          <Box mt={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by rep</InputLabel>
              <Select
                label="Filter by rep"
                value={filters.ownerId ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, ownerId: e.target.value || undefined }))
                }
                data-testid="filter-by-rep"
              >
                <MenuItem value="">All reps</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Report sections */}
      <Stack spacing={4}>
        <DealsReportSection filters={effectiveFilters} />
        <PipelineValueSection filters={effectiveFilters} />
        <ActivitiesReportSection filters={effectiveFilters} />
        <LeadsBySourceSection filters={effectiveFilters} />
      </Stack>
    </Container>
  )
}
