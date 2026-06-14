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
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Close, TrendingUpOutlined } from '@mui/icons-material'
import { AxiosError } from 'axios'
import { useStages } from '../hooks/useStages'
import { useDealMutations } from '../hooks/useDealMutations'
import { createDealSchema, updateDealSchema, CreateDealFormValues, UpdateDealFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'
import { useAuth } from '../../../hooks/useAuth'
import type { Deal } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editDeal?: Deal | null
  defaultStageId?: string
}

export function DealForm({ open, onClose, editDeal, defaultStageId }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const authUser = useAuth()
  const { create, update } = useDealMutations()
  const { data: stages = [] } = useStages()
  const isEdit = !!editDeal

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateDealFormValues>({
    resolver: zodResolver(isEdit ? updateDealSchema : createDealSchema),
  })

  const titleValue = watch('title') ?? editDeal?.title ?? ''

  useEffect(() => {
    if (open && editDeal) {
      reset({
        title: editDeal.title,
        stageId: editDeal.stageId,
        value: editDeal.value ?? undefined,
        expectedCloseDate: editDeal.expectedCloseDate ?? '',
        contactId: editDeal.contactId ?? '',
        companyId: editDeal.companyId ?? '',
      })
    } else if (open && !editDeal) {
      reset({
        title: '',
        stageId: defaultStageId ?? '',
        value: undefined,
        expectedCloseDate: '',
        contactId: '',
        companyId: '',
      })
    }
    if (!open) {
      reset({})
      setServerError(null)
    }
  }, [open, editDeal, defaultStageId, reset])

  function handleApiError(err: unknown) {
    if (err instanceof AxiosError) {
      setServerError(getApiErrorMessage(err))
    } else {
      setServerError('An unexpected error occurred.')
    }
  }

  function onSubmit(values: CreateDealFormValues) {
    setServerError(null)
    if (isEdit) {
      update.mutate(
        { id: editDeal!.id, data: values as UpdateDealFormValues },
        { onSuccess: onClose, onError: handleApiError },
      )
    } else {
      create.mutate(values, { onSuccess: onClose, onError: handleApiError })
    }
  }

  const isPending = create.isPending || update.isPending

  const { ref: titleRef, ...titleRest } = register('title')
  const { ref: valueRef, ...valueRest } = register('value')
  const { ref: expectedCloseDateRef, ...expectedCloseDateRest } = register('expectedCloseDate')
  const { ref: stageIdRef, ...stageIdRest } = register('stageId')

  const isManagerOrAbove =
    authUser?.role === 'admin' || authUser?.role === 'manager'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 480, display: 'flex', flexDirection: 'column' } }}
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
              {isEdit ? 'Edit deal' : 'New deal'}
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

        {/* Deal info section */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Deal info
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
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0, step: 0.01 }}
        />

        <FormControl
          fullWidth
          size="small"
          margin="dense"
          error={!!errors.stageId}
          required
          sx={{ mt: 1 }}
        >
          <InputLabel>Stage</InputLabel>
          <Select
            label="Stage"
            inputRef={stageIdRef}
            {...stageIdRest}
            defaultValue={defaultStageId ?? ''}
          >
            {stages
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.name}
                </MenuItem>
              ))}
          </Select>
          {errors.stageId && (
            <FormHelperText>{errors.stageId.message}</FormHelperText>
          )}
        </FormControl>

        <Divider sx={{ my: 2.5 }} />

        {/* Details section */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Details
        </Typography>

        <TextField
          label="Expected close date"
          type="date"
          fullWidth
          size="small"
          margin="dense"
          inputRef={expectedCloseDateRef}
          {...expectedCloseDateRest}
          error={!!errors.expectedCloseDate}
          helperText={errors.expectedCloseDate?.message}
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 1 }}
        />


        {isManagerOrAbove && editDeal && (
          <TextField
            label="Owner"
            fullWidth
            size="small"
            margin="dense"
            value={editDeal.ownerName}
            disabled
            helperText="Owner is set when the deal was created"
          />
        )}
      </Box>

      {/* Sticky footer */}
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
          {isEdit ? 'Save changes' : 'Create deal'}
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Cancel
        </Button>
      </Box>
    </Drawer>
  )
}
