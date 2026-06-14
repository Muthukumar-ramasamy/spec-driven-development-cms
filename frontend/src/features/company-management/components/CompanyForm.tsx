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
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  BusinessOutlined,
  Close,
  LanguageOutlined,
  CategoryOutlined,
  PeopleOutlined,
  NotesOutlined,
} from '@mui/icons-material'
import { AxiosError } from 'axios'
import { useCompanyMutations } from '../hooks/useCompanyMutations'
import { createCompanySchema, CreateCompanyFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'
import type { Company } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editCompany?: Company | null
}

export function CompanyForm({ open, onClose, editCompany }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const { create, update } = useCompanyMutations()
  const isEdit = !!editCompany

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
  })

  const nameValue = watch('name') ?? editCompany?.name ?? ''

  useEffect(() => {
    if (open && editCompany) {
      reset({
        name: editCompany.name,
        website: editCompany.website ?? '',
        industry: editCompany.industry ?? '',
        employeeCount: editCompany.employeeCount ?? undefined,
        notes: editCompany.notes ?? '',
      })
    }
    if (!open) {
      reset({})
      setServerError(null)
      setConflictError(null)
    }
  }, [open, editCompany, reset])

  function handleApiError(err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 409) {
      const message =
        (err.response?.data?.message as string | undefined) ??
        'A company with this name already exists.'
      setConflictError(message)
      setError('name', { message })
    } else {
      setServerError(getApiErrorMessage(err))
    }
  }

  function onSubmit(values: CreateCompanyFormValues) {
    setServerError(null)
    setConflictError(null)
    if (isEdit) {
      update.mutate(
        { id: editCompany!.id, data: values },
        { onSuccess: onClose, onError: handleApiError },
      )
    } else {
      create.mutate(values, { onSuccess: onClose, onError: handleApiError })
    }
  }

  const isPending = create.isPending || update.isPending

  const { ref: nameRef, ...nameRest } = register('name')
  const { ref: websiteRef, ...websiteRest } = register('website')
  const { ref: industryRef, ...industryRest } = register('industry')
  const { ref: employeeCountRef, ...employeeCountRest } = register('employeeCount')
  const { ref: notesRef, ...notesRest } = register('notes')

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
            <BusinessOutlined fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              {isEdit ? 'Edit company' : 'New company'}
            </Typography>
            {nameValue && (
              <Typography variant="caption" color="text.secondary">
                {nameValue}
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
        {conflictError && !errors.name && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {conflictError}
          </Alert>
        )}

        {/* Basic info */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Basic information
        </Typography>

        <TextField
          label="Company name"
          required
          fullWidth
          size="small"
          margin="dense"
          inputRef={nameRef}
          {...nameRest}
          error={!!errors.name}
          helperText={errors.name?.message}
          sx={{ mt: 1 }}
        />

        <TextField
          label="Website"
          fullWidth
          size="small"
          margin="dense"
          placeholder="https://example.com"
          inputRef={websiteRef}
          {...websiteRest}
          error={!!errors.website}
          helperText={errors.website?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LanguageOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Divider sx={{ my: 2.5 }} />

        {/* Company details */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Company details
        </Typography>

        <TextField
          label="Industry"
          fullWidth
          size="small"
          margin="dense"
          placeholder="e.g. Technology, Finance"
          inputRef={industryRef}
          {...industryRest}
          error={!!errors.industry}
          helperText={errors.industry?.message}
          sx={{ mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CategoryOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Employee count"
          type="number"
          fullWidth
          size="small"
          margin="dense"
          inputRef={employeeCountRef}
          {...employeeCountRest}
          inputProps={{ min: 0 }}
          error={!!errors.employeeCount}
          helperText={errors.employeeCount?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PeopleOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Divider sx={{ my: 2.5 }} />

        {/* Notes */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Notes
        </Typography>

        <TextField
          fullWidth
          size="small"
          margin="dense"
          multiline
          rows={4}
          placeholder="Add any notes about this company…"
          inputRef={notesRef}
          {...notesRest}
          error={!!errors.notes}
          helperText={errors.notes?.message}
          sx={{ mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                <NotesOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
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
          form="company-form"
          variant="contained"
          disabled={isPending}
          onClick={handleSubmit(onSubmit)}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flex: 1 }}
        >
          {isEdit ? 'Save changes' : 'Create company'}
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Cancel
        </Button>
      </Box>
    </Drawer>
  )
}
