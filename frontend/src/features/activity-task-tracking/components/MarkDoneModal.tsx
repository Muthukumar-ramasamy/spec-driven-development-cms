import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { AxiosError } from 'axios'
import { markDoneSchema, MarkDoneFormValues } from '../schemas'
import { useActivityMutations } from '../hooks/useActivityMutations'
import { getApiErrorMessage } from '../../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
  activityId: string
  activitySubject: string
}

export function MarkDoneModal({ open, onClose, activityId, activitySubject }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const { markDone } = useActivityMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MarkDoneFormValues>({
    resolver: zodResolver(markDoneSchema),
  })

  function handleClose() {
    reset()
    setServerError(null)
    onClose()
  }

  function onSubmit(values: MarkDoneFormValues) {
    setServerError(null)
    markDone.mutate(
      { id: activityId, notes: values.notes },
      {
        onSuccess: handleClose,
        onError: (err: unknown) => {
          if (err instanceof AxiosError && err.response?.status === 400) {
            const msg =
              (err.response?.data?.message as string | undefined) ??
              'This activity is already marked as done.'
            setServerError(msg)
          } else {
            setServerError(getApiErrorMessage(err))
          }
        },
      },
    )
  }

  const { ref: notesRef, ...notesRest } = register('notes')

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mark as Done</DialogTitle>

      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Activity: <strong>{activitySubject}</strong>
        </Typography>

        <Box
          component="form"
          id="mark-done-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <TextField
            label="Outcome note"
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="Describe the outcome (optional)…"
            inputRef={notesRef}
            {...notesRest}
            error={!!errors.notes}
            helperText={errors.notes?.message}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          form="mark-done-form"
          variant="contained"
          color="success"
          disabled={markDone.isPending}
          startIcon={
            markDone.isPending ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          onClick={handleSubmit(onSubmit)}
        >
          Mark Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
