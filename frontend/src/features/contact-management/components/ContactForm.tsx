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
import { useContactMutations } from '../hooks/useContactMutations'
import { createContactSchema, CreateContactFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'
import type { Contact } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  editContact?: Contact | null
}

export function ContactForm({ open, onClose, editContact }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const { create, update } = useContactMutations()
  const isEdit = !!editContact

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContactFormValues>({
    resolver: zodResolver(createContactSchema),
  })

  useEffect(() => {
    if (open && editContact) {
      reset({
        firstName: editContact.firstName,
        lastName: editContact.lastName ?? '',
        email: editContact.email ?? '',
        phone: editContact.phone ?? '',
        jobTitle: editContact.jobTitle ?? '',
      })
    }
    if (!open) {
      reset({})
      setServerError(null)
    }
  }, [open, editContact, reset])

  function onSubmit(values: CreateContactFormValues) {
    setServerError(null)
    if (isEdit) {
      update.mutate(
        { id: editContact!.id, data: values },
        {
          onSuccess: onClose,
          onError: (err) => setServerError(getApiErrorMessage(err)),
        },
      )
    } else {
      create.mutate(values, {
        onSuccess: onClose,
        onError: (err) => setServerError(getApiErrorMessage(err)),
      })
    }
  }

  const isPending = create.isPending || update.isPending
  const { ref: firstRef, ...firstRest } = register('firstName')
  const { ref: lastRef, ...lastRest } = register('lastName')
  const { ref: emailRef, ...emailRest } = register('email')
  const { ref: phoneRef, ...phoneRest } = register('phone')
  const { ref: jobRef, ...jobRest } = register('jobTitle')

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 420, p: 3 } }}
    >
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {isEdit ? 'Edit contact' : 'New contact'}
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="First name"
          required
          fullWidth
          margin="normal"
          inputRef={firstRef}
          {...firstRest}
          error={!!errors.firstName}
          helperText={errors.firstName?.message}
        />
        <TextField
          label="Last name"
          fullWidth
          margin="normal"
          inputRef={lastRef}
          {...lastRest}
        />
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          inputRef={emailRef}
          {...emailRest}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Phone"
          fullWidth
          margin="normal"
          inputRef={phoneRef}
          {...phoneRest}
        />
        <TextField
          label="Job title"
          fullWidth
          margin="normal"
          inputRef={jobRef}
          {...jobRest}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            fullWidth
          >
            {isEdit ? 'Save changes' : 'Create contact'}
          </Button>
          <Button onClick={onClose} variant="outlined" color="inherit" fullWidth>
            Cancel
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
