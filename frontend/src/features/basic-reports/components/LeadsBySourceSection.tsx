import {
  Alert,
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useLeadsBySourceReport } from '../hooks/useLeadsBySourceReport'
import type { ReportsFilters } from '../types'

function formatPercent(count: number, total: number): string {
  if (total === 0) return '0%'
  return `${((count / total) * 100).toFixed(1)}%`
}

interface LeadsBySourceSectionProps {
  filters: ReportsFilters
}

export function LeadsBySourceSection({ filters }: LeadsBySourceSectionProps) {
  const { data, isLoading, isError, refetch } = useLeadsBySourceReport(filters)

  const totalLeads = data ? data.sources.reduce((sum, s) => sum + s.count, 0) : 0

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Leads by Source
      </Typography>

      {isLoading && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Source', 'Count', '% of Total'].map((h) => (
                  <TableCell key={h}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Box
              component="button"
              onClick={() => void refetch()}
              sx={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Retry
            </Box>
          }
        >
          Failed to load leads by source report.
        </Alert>
      )}

      {!isLoading && !isError && data && data.sources.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No leads found for this date range.
        </Typography>
      )}

      {!isLoading && !isError && data && data.sources.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Source</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Count</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>% of Total</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.sources.map((row) => (
                  <TableRow key={row.source} hover>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{row.source}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                    <TableCell align="right">{formatPercent(row.count, totalLeads)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell>
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{totalLeads}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>100%</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {data.dateRange.startDate} &mdash; {data.dateRange.endDate}
          </Typography>
        </>
      )}
    </Paper>
  )
}
