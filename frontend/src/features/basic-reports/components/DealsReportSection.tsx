import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material'
import { useDealsReport } from '../hooks/useDealsReport'
import type { ReportsFilters } from '../types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

interface StatCardProps {
  label: string
  count: number
  value: number
  color: string
}

function StatCard({ label, count, value, color }: StatCardProps) {
  return (
    <Paper
      elevation={1}
      sx={{ p: 3, borderTop: 4, borderColor: color, borderRadius: 2 }}
    >
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>
        {formatCurrency(value)}
      </Typography>
    </Paper>
  )
}

function StatCardSkeleton() {
  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" height={48} />
      <Skeleton variant="text" width="50%" />
    </Paper>
  )
}

interface DealsReportSectionProps {
  filters: ReportsFilters
}

export function DealsReportSection({ filters }: DealsReportSectionProps) {
  const { data, isLoading, isError, refetch } = useDealsReport(filters)

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Deals Won / Lost
      </Typography>

      {isLoading && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <StatCardSkeleton />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatCardSkeleton />
          </Grid>
        </Grid>
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
          Failed to load deals report.
        </Alert>
      )}

      {!isLoading && !isError && data && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <StatCard
                label="Won Deals"
                count={data.won.count}
                value={data.won.totalValue}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                label="Lost Deals"
                count={data.lost.count}
                value={data.lost.totalValue}
                color="error.main"
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {data.dateRange.startDate} &mdash; {data.dateRange.endDate}
          </Typography>
        </>
      )}

      {!isLoading && !isError && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Paper>
  )
}
