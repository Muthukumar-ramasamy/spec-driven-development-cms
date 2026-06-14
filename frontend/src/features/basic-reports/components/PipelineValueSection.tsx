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
import { usePipelineValueReport } from '../hooks/usePipelineValueReport'
import type { ReportsFilters } from '../types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

interface PipelineValueSectionProps {
  filters: ReportsFilters
}

export function PipelineValueSection({ filters }: PipelineValueSectionProps) {
  const { data, isLoading, isError, refetch } = usePipelineValueReport(filters)

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Pipeline Value by Stage
      </Typography>

      {isLoading && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Stage', 'Deals', 'Total Value', '% of Pipeline'].map((h) => (
                  <TableCell key={h}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
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
          Failed to load pipeline value report.
        </Alert>
      )}

      {!isLoading && !isError && data && data.stages.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          No open deals found in the pipeline.
        </Typography>
      )}

      {!isLoading && !isError && data && data.stages.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Stage</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Deals</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Total Value</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>% of Pipeline</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.stages.map((stage) => (
                  <TableRow key={stage.stageId} hover>
                    <TableCell>{stage.stageName}</TableCell>
                    <TableCell align="right">{stage.dealCount}</TableCell>
                    <TableCell align="right">{formatCurrency(stage.totalValue)}</TableCell>
                    <TableCell align="right">
                      {formatPercent(stage.totalValue, data.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell>
                    <strong>Grand Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {data.stages.reduce((sum, s) => sum + s.dealCount, 0)}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(data.grandTotal)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>100%</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  )
}
