import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AttachMoneyOutlined,
  Close,
  TrendingUpOutlined,
} from '@mui/icons-material'
import { AxiosError } from 'axios'
import { useLeadMutations } from '../hooks/useLeadMutations'
import { createLeadSchema, updateLeadSchema } from '../schemas'
import type { CreateLeadFormValues, UpdateLeadFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'
import type { Lead } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editLead?: Lead | null
}

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

export function LeadForm({ open, onClose, editLead }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const { create, update } = useLeadMutations()
  const isEdit = !!editLead

  const schema = isEdit ? updateLeadSchema : createLeadSchema

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateLeadFormValues | UpdateLeadFormValues>({
    resolver: zodResolver(schema),
  })

  const titleValue = watch('title') ?? editLead?.title ?? ''

  useEffect(() => {
    if (open && editLead) {
      reset({
        title: editLead.title,
        value: editLead.value ?? undefined,
        source: editLead.source ?? '',
      })
    }
    if (!open) {
      reset({})
      setServerError(null)
      setConflictError(null)
    }
  }, [open, editLead, reset])

  function handleApiError(err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 409) {
      const message =
        (err.response?.data?.message as string | undefined) ??
        'A lead with this title already exists.'
      setConflictError(message)
      setError('title', { message })
    } else {
      setServerError(getApiErrorMessage(err))
    }
  }

  function onSubmit(values: CreateLeadFormValues | UpdateLeadFormValues) {
    setServerError(null)
    setConflictError(null)

    const payload = {
      ...values,
      source: (values.source as string | undefined) || undefined,
    }

    if (isEdit) {
      update.mutate(
        { id: editLead!.id, data: payload as UpdateLeadFormValues },
        { onSuccess: onClose, onError: handleApiError },
      )
    } else {
      create.mutate(payload as CreateLeadFormValues, {
        onSuccess: onClose,
        onError: handleApiError,
      })
    }
  }

  const isPending = create.isPending || update.isPending

  const { ref: titleRef, ...titleRest } = register('title')
  const { ref: valueRef, ...valueRest } = register('value')
  // contactId and companyId are linked via the detail drawer (dropdown pickers), not raw UUID fields

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 440, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
            <TrendingUpOutlined fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              {isEdit ? 'Edit lead' : 'New lead'}
            </Typography>
            {titleValue && (
              <Typography variant="caption" color="text.secondary">
                {titleValue}
              </Typography>
            )}
          </Box>
        </Box>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Body */}
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}
      >
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        {conflictError && !errors.title && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {conflictError}
          </Alert>
        )}

        {/* Lead info section */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Lead info
        </Typography>

        <TextField
          label="Title"
          required
          fullWidth
          size="small"
          margin="dense"
          inputRef={titleRef}
          {...titleRest}
          error={!!errors.title}
          helperText={errors.title?.message}
          sx={{ mt: 1 }}
        />

        <TextField
          label="Value"
          type="number"
          fullWidth
          size="small"
          margin="dense"
          inputRef={valueRef}
          {...valueRest}
          error={!!errors.value}
          helperText={errors.value?.message}
          inputProps={{ min: 0, step: 0.01 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AttachMoneyOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Divider sx={{ my: 2.5 }} />

        {/* Details section */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Details
        </Typography>

        <FormControl fullWidth size="small" margin="dense" sx={{ mt: 1 }}>
          <InputLabel>Source</InputLabel>
          <Select
            label="Source"
            defaultValue=""
            inputProps={register('source')}
            error={!!errors.source}
          >
            <MenuItem value="">None</MenuItem>
            {SOURCE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1.5,
          bgcolor: 'grey.50',
        }}
      >
        <Button
          type="submit"
          variant="contained"
          disabled={isPending}
          onClick={handleSubmit(onSubmit)}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flex: 1 }}
        >
          {isEdit ? 'Save changes' : 'Create lead'}
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Cancel
        </Button>
      </Box>
    </Drawer>
  )
}
