import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Close,
  EventNoteOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
} from '@mui/icons-material'
import { AxiosError } from 'axios'
import { useActivityMutations } from '../hooks/useActivityMutations'
import { createActivitySchema, updateActivitySchema, ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'
import { ActivityTypeIcon } from './ActivityTypeIcon'
import type { Activity, LinkedRecord } from '../types'
import type { CreateActivityFormValues, UpdateActivityFormValues } from '../schemas'

interface Props {
  open: boolean
  onClose: () => void
  editActivity?: Activity | null
  linkedRecord?: LinkedRecord
}

// Derive a sensible default mode: if editing a done activity → 'log', else → 'schedule'
function deriveMode(edit?: Activity | null): 'log' | 'schedule' {
  if (!edit) return 'schedule'
  return edit.done ? 'log' : 'schedule'
}

export function ActivityForm({ open, onClose, editActivity, linkedRecord }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [mode, setMode] = useState<'log' | 'schedule'>(deriveMode(editActivity))

  const { create, update } = useActivityMutations()
  const isEdit = !!editActivity

  // When editing, use the update schema (all optional); when creating, use the create schema.
  const schema = isEdit ? updateActivitySchema : createActivitySchema

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateActivityFormValues>({
    resolver: zodResolver(schema as typeof createActivitySchema),
    defaultValues: {
      done: mode === 'log',
    },
  })

  // Sync mode toggle → done field
  useEffect(() => {
    setValue('done', mode === 'log')
  }, [mode, setValue])

  // Pre-fill linked record IDs
  useEffect(() => {
    if (open && linkedRecord) {
      if (linkedRecord.type === 'deal') setValue('dealId', linkedRecord.id)
      if (linkedRecord.type === 'contact') setValue('contactId', linkedRecord.id)
      if (linkedRecord.type === 'company') setValue('companyId', linkedRecord.id)
      if (linkedRecord.type === 'lead') setValue('leadId', linkedRecord.id)
    }
  }, [open, linkedRecord, setValue])

  // Reset when opening in edit mode
  useEffect(() => {
    if (open && editActivity) {
      const m = deriveMode(editActivity)
      setMode(m)
      reset({
        type: editActivity.type,
        subject: editActivity.subject,
        notes: editActivity.notes ?? '',
        done: editActivity.done,
        dueDate: editActivity.dueDate ?? '',
        dealId: editActivity.dealId ?? '',
        contactId: editActivity.contactId ?? '',
        companyId: editActivity.companyId ?? '',
        leadId: editActivity.leadId ?? '',
      })
    }
    if (!open) {
      setServerError(null)
      reset({
        done: false,
        dealId: linkedRecord?.type === 'deal' ? linkedRecord.id : '',
        contactId: linkedRecord?.type === 'contact' ? linkedRecord.id : '',
        companyId: linkedRecord?.type === 'company' ? linkedRecord.id : '',
        leadId: linkedRecord?.type === 'lead' ? linkedRecord.id : '',
      })
      setMode('schedule')
    }
  }, [open, editActivity, linkedRecord, reset])

  function handleApiError(err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 400) {
      const msg =
        (err.response?.data?.message as string | undefined) ??
        'An activity must be linked to at least one record.'
      setServerError(msg)
    } else {
      setServerError(getApiErrorMessage(err))
    }
  }

  function onSubmit(values: CreateActivityFormValues) {
    setServerError(null)
    if (isEdit) {
      const updatePayload: UpdateActivityFormValues = {
        type: values.type,
        subject: values.subject,
        notes: values.notes,
        dueDate: values.dueDate,
      }
      update.mutate(
        { id: editActivity!.id, data: updatePayload },
        { onSuccess: onClose, onError: handleApiError },
      )
    } else {
      create.mutate(values, { onSuccess: onClose, onError: handleApiError })
    }
  }

  const isPending = create.isPending || update.isPending
  const watchDone = watch('done')
  const showDueDate = !watchDone

  const { ref: subjectRef, ...subjectRest } = register('subject')
  const { ref: notesRef, ...notesRest } = register('notes')
  const { ref: dueDateRef, ...dueDateRest } = register('dueDate')
  const { ref: dealIdRef, ...dealIdRest } = register('dealId')
  const { ref: contactIdRef, ...contactIdRest } = register('contactId')
  const { ref: companyIdRef, ...companyIdRest } = register('companyId')
  const { ref: leadIdRef, ...leadIdRest } = register('leadId')

  const drawerTitle = isEdit
    ? 'Edit activity'
    : mode === 'log'
    ? 'Log activity'
    : 'Schedule task'

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
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
            <EventNoteOutlined fontSize="small" />
          </Avatar>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            {drawerTitle}
          </Typography>
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
        {/* Error alerts */}
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        {/* Mode toggle (only for create) */}
        {!isEdit && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode !== null) setMode(newMode as 'log' | 'schedule')
              }}
              size="small"
              aria-label="Activity mode"
            >
              <ToggleButton value="log" aria-label="Log activity">
                <CheckCircleOutlined fontSize="small" sx={{ mr: 0.5 }} />
                Log activity
              </ToggleButton>
              <ToggleButton value="schedule" aria-label="Schedule task">
                <ScheduleOutlined fontSize="small" sx={{ mr: 0.5 }} />
                Schedule task
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Section: Activity */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Activity
        </Typography>

        {/* Type select */}
        <FormControl fullWidth size="small" margin="dense" error={!!errors.type} sx={{ mt: 1 }}>
          <InputLabel>Type *</InputLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select label="Type *" {...field} value={field.value ?? ''}>
                {ACTIVITY_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ActivityTypeIcon type={t} fontSize="small" />
                      {ACTIVITY_TYPE_LABELS[t]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
        </FormControl>

        {/* Subject */}
        <TextField
          label="Subject"
          required
          fullWidth
          size="small"
          margin="dense"
          placeholder="e.g. Follow-up call with ACME"
          inputRef={subjectRef}
          {...subjectRest}
          error={!!errors.subject}
          helperText={errors.subject?.message}
        />

        {/* Section: Link to record */}
        <Divider sx={{ my: 2.5 }} />
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Link to record
        </Typography>

        {linkedRecord ? (
          /* Read-only chip when a linked record is pre-filled */
          <Box sx={{ mt: 1, mb: 1 }}>
            <Chip
              label={`${linkedRecord.type.charAt(0).toUpperCase() + linkedRecord.type.slice(1)}: ${linkedRecord.label}`}
              variant="outlined"
              color="primary"
              size="small"
            />
          </Box>
        ) : (
          /* Manual UUID fields when no linked record is provided */
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Deal ID"
              fullWidth
              size="small"
              margin="dense"
              placeholder="UUID (optional)"
              inputRef={dealIdRef}
              {...dealIdRest}
              error={!!errors.dealId}
              helperText={errors.dealId?.message}
            />
            <TextField
              label="Contact ID"
              fullWidth
              size="small"
              margin="dense"
              placeholder="UUID (optional)"
              inputRef={contactIdRef}
              {...contactIdRest}
              error={!!errors.contactId}
              helperText={errors.contactId?.message}
            />
            <TextField
              label="Company ID"
              fullWidth
              size="small"
              margin="dense"
              placeholder="UUID (optional)"
              inputRef={companyIdRef}
              {...companyIdRest}
              error={!!errors.companyId}
              helperText={errors.companyId?.message}
            />
            <TextField
              label="Lead ID"
              fullWidth
              size="small"
              margin="dense"
              placeholder="UUID (optional)"
              inputRef={leadIdRef}
              {...leadIdRest}
              error={!!errors.leadId}
              helperText={errors.leadId?.message}
            />
          </Box>
        )}

        {/* Section: Details */}
        <Divider sx={{ my: 2.5 }} />
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Details
        </Typography>

        {/* Due date — only shown when scheduling (done=false) */}
        {showDueDate && (
          <TextField
            label="Due date"
            type="date"
            fullWidth
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
            inputRef={dueDateRef}
            {...dueDateRest}
            error={!!errors.dueDate}
            helperText={errors.dueDate?.message}
            sx={{ mt: 1 }}
          />
        )}

        {/* Notes */}
        <TextField
          label="Notes"
          fullWidth
          size="small"
          margin="dense"
          multiline
          rows={3}
          placeholder="Add notes or outcome…"
          inputRef={notesRef}
          {...notesRest}
          error={!!errors.notes}
          helperText={errors.notes?.message}
          sx={{ mt: showDueDate ? 0 : 1 }}
        />

        {/* Hidden done field — controlled by mode toggle */}
        <Controller
          name="done"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={!!field.value} size="small" />}
              label="Mark as done"
              sx={{ display: 'none' }}
            />
          )}
        />
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
          {isEdit ? 'Save changes' : mode === 'log' ? 'Log activity' : 'Save task'}
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Cancel
        </Button>
      </Box>
    </Drawer>
  )
}
