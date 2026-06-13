import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  TextField,
  Typography,
} from '@mui/material'
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
    formState: { errors },
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
  })

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
        {
          onSuccess: onClose,
          onError: handleApiError,
        },
      )
    } else {
      create.mutate(values, {
        onSuccess: onClose,
        onError: handleApiError,
      })
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
      PaperProps={{ sx: { width: 420, p: 3 } }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {isEdit ? 'Edit company' : 'New company'}
      </Typography>

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

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Company name"
          required
          fullWidth
          margin="normal"
          inputRef={nameRef}
          {...nameRest}
          error={!!errors.name}
          helperText={errors.name?.message}
        />
        <TextField
          label="Website"
          fullWidth
          margin="normal"
          placeholder="https://example.com"
          inputRef={websiteRef}
          {...websiteRest}
          error={!!errors.website}
          helperText={errors.website?.message}
        />
        <TextField
          label="Industry"
          fullWidth
          margin="normal"
          inputRef={industryRef}
          {...industryRest}
          error={!!errors.industry}
          helperText={errors.industry?.message}
        />
        <TextField
          label="Employee count"
          type="number"
          fullWidth
          margin="normal"
          inputRef={employeeCountRef}
          {...employeeCountRest}
          inputProps={{ min: 0 }}
          error={!!errors.employeeCount}
          helperText={errors.employeeCount?.message}
        />
        <TextField
          label="Notes"
          fullWidth
          margin="normal"
          multiline
          rows={3}
          inputRef={notesRef}
          {...notesRest}
          error={!!errors.notes}
          helperText={errors.notes?.message}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            fullWidth
          >
            {isEdit ? 'Save changes' : 'Create company'}
          </Button>
          <Button onClick={onClose} variant="outlined" color="inherit" fullWidth>
            Cancel
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
