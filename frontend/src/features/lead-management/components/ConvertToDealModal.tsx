import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useLeadMutations } from '../hooks/useLeadMutations'
import { getApiErrorMessage } from '../../../lib/api'

const convertSchema = z.object({
  stageId: z.string().uuid('Please enter a valid stage UUID'),
})

type ConvertFormValues = z.infer<typeof convertSchema>

interface Props {
  open: boolean
  leadId: string
  leadTitle: string
  onClose: () => void
  onSuccess?: () => void
}

export function ConvertToDealModal({
  open,
  leadId,
  leadTitle,
  onClose,
  onSuccess,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [alreadyConvertedError, setAlreadyConvertedError] = useState<string | null>(null)
  const { convert } = useLeadMutations()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvertFormValues>({
    resolver: zodResolver(convertSchema),
  })

  function handleClose() {
    reset()
    setServerError(null)
    setAlreadyConvertedError(null)
    onClose()
  }

  function onSubmit(values: ConvertFormValues) {
    setServerError(null)
    setAlreadyConvertedError(null)

    convert.mutate(
      { id: leadId, stageId: values.stageId },
      {
        onSuccess: () => {
          reset()
          onSuccess?.()
          onClose()
        },
        onError: (err: unknown) => {
          if (err instanceof AxiosError) {
            if (err.response?.status === 422) {
              const msg =
                (err.response?.data?.message as string | undefined) ??
                'This lead has already been converted.'
              setAlreadyConvertedError(msg)
            } else {
              setServerError(getApiErrorMessage(err))
            }
          } else {
            setServerError(getApiErrorMessage(err))
          }
        },
      },
    )
  }

  const { ref: stageIdRef, ...stageIdRest } = register('stageId')

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Convert Lead to Deal</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Converting <strong>{leadTitle}</strong> will create a new deal in the
          selected pipeline stage. The lead's title and value will be carried over to
          the deal. This action cannot be undone.
        </Typography>

        {alreadyConvertedError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {alreadyConvertedError}
          </Alert>
        )}

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box
          component="form"
          id="convert-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <TextField
            label="Pipeline Stage ID"
            required
            fullWidth
            size="small"
            margin="dense"
            placeholder="Enter stage UUID"
            inputRef={stageIdRef}
            {...stageIdRest}
            error={!!errors.stageId}
            helperText={
              errors.stageId?.message ??
              'Note: A proper stage selector will be available once Deal Pipeline Management is implemented.'
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          form="convert-form"
          variant="contained"
          disabled={convert.isPending}
          onClick={handleSubmit(onSubmit)}
          startIcon={
            convert.isPending ? <CircularProgress size={14} color="inherit" /> : undefined
          }
        >
          Convert
        </Button>
      </DialogActions>
    </Dialog>
  )
}
