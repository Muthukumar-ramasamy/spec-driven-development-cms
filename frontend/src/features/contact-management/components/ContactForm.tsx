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
  PersonOutlined,
  Close,
  EmailOutlined,
  PhoneOutlined,
  WorkOutlined,
} from '@mui/icons-material'
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
    watch,
    formState: { errors },
  } = useForm<CreateContactFormValues>({
    resolver: zodResolver(createContactSchema),
  })

  const firstName = watch('firstName') ?? editContact?.firstName ?? ''
  const lastName = watch('lastName') ?? editContact?.lastName ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ')

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
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
            <PersonOutlined fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              {isEdit ? 'Edit contact' : 'New contact'}
            </Typography>
            {displayName && (
              <Typography variant="caption" color="text.secondary">
                {displayName}
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

        {/* Name */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Name
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
          <TextField
            label="First name"
            required
            fullWidth
            size="small"
            margin="dense"
            inputRef={firstRef}
            {...firstRest}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
          <TextField
            label="Last name"
            fullWidth
            size="small"
            margin="dense"
            inputRef={lastRef}
            {...lastRest}
          />
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* Contact details */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Contact details
        </Typography>

        <TextField
          label="Email"
          type="email"
          fullWidth
          size="small"
          margin="dense"
          placeholder="name@company.com"
          inputRef={emailRef}
          {...emailRest}
          error={!!errors.email}
          helperText={errors.email?.message}
          sx={{ mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Phone"
          fullWidth
          size="small"
          margin="dense"
          placeholder="+1 (555) 000-0000"
          inputRef={phoneRef}
          {...phoneRest}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <Divider sx={{ my: 2.5 }} />

        {/* Professional */}
        <Typography variant="overline" color="text.secondary" fontWeight={600}>
          Professional
        </Typography>

        <TextField
          label="Job title"
          fullWidth
          size="small"
          margin="dense"
          placeholder="e.g. VP of Sales"
          inputRef={jobRef}
          {...jobRest}
          sx={{ mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <WorkOutlined fontSize="small" sx={{ color: 'text.disabled' }} />
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
          variant="contained"
          disabled={isPending}
          onClick={handleSubmit(onSubmit)}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ flex: 1 }}
        >
          {isEdit ? 'Save changes' : 'Create contact'}
        </Button>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: 1 }}>
          Cancel
        </Button>
      </Box>
    </Drawer>
  )
}
