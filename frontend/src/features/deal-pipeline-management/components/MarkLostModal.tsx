import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { AxiosError } from 'axios'
import { markLostSchema, MarkLostFormValues } from '../schemas'
import { useDealMutations } from '../hooks/useDealMutations'
import { getApiErrorMessage } from '../../../lib/api'

interface Props {
  open: boolean
  dealId: string
  onClose: () => void
}

export function MarkLostModal({ open, dealId, onClose }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const { markLost } = useDealMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MarkLostFormValues>({
    resolver: zodResolver(markLostSchema),
  })

  function handleClose() {
    reset()
    setServerError(null)
    onClose()
  }

  function onSubmit(values: MarkLostFormValues) {
    setServerError(null)
    markLost.mutate(
      { id: dealId, lostReason: values.lostReason },
      {
        onSuccess: handleClose,
        onError: (err: unknown) => {
          if (err instanceof AxiosError) {
            setServerError(getApiErrorMessage(err))
          } else {
            setServerError('An unexpected error occurred.')
          }
        },
      },
    )
  }

  const { ref: lostReasonRef, ...lostReasonRest } = register('lostReason')

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark Deal as Lost</DialogTitle>

      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <TextField
          label="Lost reason"
          required
          fullWidth
          multiline
          rows={3}
          margin="dense"
          placeholder="Describe why this deal was lost…"
          inputRef={lostReasonRef}
          {...lostReasonRest}
          error={!!errors.lostReason}
          helperText={errors.lostReason?.message}
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          color="error"
          variant="contained"
          disabled={markLost.isPending}
          startIcon={markLost.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          Mark as Lost
        </Button>
      </DialogActions>
    </Dialog>
  )
}
