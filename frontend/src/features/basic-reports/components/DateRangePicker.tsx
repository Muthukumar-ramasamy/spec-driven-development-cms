import { Box, Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material'
import type { ReportsFilters } from '../types'

interface DateRangePickerProps {
  filters: ReportsFilters
  onChange: (filters: ReportsFilters) => void
}

type Preset = 'last7' | 'last30' | 'last90' | 'thisQuarter'

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function computePreset(preset: Preset): { startDate: string; endDate: string } {
  const today = new Date()
  const end = toISODate(today)

  if (preset === 'last7') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return { startDate: toISODate(start), endDate: end }
  }

  if (preset === 'last30') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return { startDate: toISODate(start), endDate: end }
  }

  if (preset === 'last90') {
    const start = new Date(today)
    start.setDate(today.getDate() - 89)
    return { startDate: toISODate(start), endDate: end }
  }

  // thisQuarter
  const month = today.getMonth()
  const quarterStartMonth = Math.floor(month / 3) * 3
  const start = new Date(today.getFullYear(), quarterStartMonth, 1)
  return { startDate: toISODate(start), endDate: end }
}

function detectPreset(startDate?: string, endDate?: string): Preset | null {
  if (!startDate || !endDate) return null
  const presets: Preset[] = ['last7', 'last30', 'last90', 'thisQuarter']
  for (const p of presets) {
    const computed = computePreset(p)
    if (computed.startDate === startDate && computed.endDate === endDate) return p
  }
  return null
}

const PRESET_LABELS: Record<Preset, string> = {
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  last90: 'Last 90 days',
  thisQuarter: 'This quarter',
}

export function DateRangePicker({ filters, onChange }: DateRangePickerProps) {
  const activePreset = detectPreset(filters.startDate, filters.endDate)

  function handlePreset(preset: Preset) {
    const range = computePreset(preset)
    onChange({ ...filters, startDate: range.startDate, endDate: range.endDate })
  }

  function handleStartDate(value: string) {
    onChange({ ...filters, startDate: value || undefined })
  }

  function handleEndDate(value: string) {
    onChange({ ...filters, endDate: value || undefined })
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Date Range
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <ButtonGroup size="small" variant="outlined" aria-label="date range preset">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((preset) => (
            <Button
              key={preset}
              variant={activePreset === preset ? 'contained' : 'outlined'}
              onClick={() => handlePreset(preset)}
            >
              {PRESET_LABELS[preset]}
            </Button>
          ))}
        </ButtonGroup>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Start date"
            type="date"
            size="small"
            value={filters.startDate ?? ''}
            onChange={(e) => handleStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'Start date' }}
          />
          <Typography variant="body2" color="text.secondary">
            to
          </Typography>
          <TextField
            label="End date"
            type="date"
            size="small"
            value={filters.endDate ?? ''}
            onChange={(e) => handleEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'End date' }}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
