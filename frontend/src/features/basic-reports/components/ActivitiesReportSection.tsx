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
import { useActivitiesReport } from '../hooks/useActivitiesReport'
import type { ReportsFilters } from '../types'

const ACTIVITY_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'demo', label: 'Demo' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'other', label: 'Other' },
]

interface ActivitiesReportSectionProps {
  filters: ReportsFilters
}

export function ActivitiesReportSection({ filters }: ActivitiesReportSectionProps) {
  const { data, isLoading, isError, refetch } = useActivitiesReport(filters)

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Activities by Rep
      </Typography>

      {isLoading && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Rep', 'Call', 'Email', 'Meeting', 'Demo', 'Lunch', 'Other', 'Total'].map(
                  (h) => (
                    <TableCell key={h}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
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
          Failed to load activities report.
        </Alert>
      )}

      {!isLoading && !isError && data && data.reps.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No activities found for this date range.
        </Typography>
      )}

      {!isLoading && !isError && data && data.reps.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Rep</strong>
                  </TableCell>
                  {ACTIVITY_COLUMNS.map((col) => (
                    <TableCell key={col.key} align="right">
                      <strong>{col.label}</strong>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <strong>Total</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.reps.map((rep) => (
                  <TableRow key={rep.userId} hover>
                    <TableCell>{rep.name}</TableCell>
                    <TableCell align="right">{rep.call}</TableCell>
                    <TableCell align="right">{rep.email}</TableCell>
                    <TableCell align="right">{rep.meeting}</TableCell>
                    <TableCell align="right">{rep.demo}</TableCell>
                    <TableCell align="right">{rep.lunch}</TableCell>
                    <TableCell align="right">{rep.other}</TableCell>
                    <TableCell align="right">
                      <strong>{rep.total}</strong>
                    </TableCell>
                  </TableRow>
                ))}
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
