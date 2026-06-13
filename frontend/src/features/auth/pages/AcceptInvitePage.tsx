import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useAcceptInvite } from '../hooks/useAuthMutations'
import { acceptInviteSchema, AcceptInviteFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormValues>({ resolver: zodResolver(acceptInviteSchema) })

  const acceptInvite = useAcceptInvite()

  if (!token) {
    return (
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          This invite link has expired. Ask your admin to resend it.
        </Alert>
        <Button component={Link} to="/login" variant="text">
          Go to login
        </Button>
      </Paper>
    )
  }

  function onSubmit(values: AcceptInviteFormValues) {
    setServerError(null)
    acceptInvite.mutate(
      { token, name: values.name, password: values.password },
      {
        onError: (err) => {
          const msg = getApiErrorMessage(err)
          setServerError(
            msg.toLowerCase().includes('expired')
              ? 'This invite link has expired. Ask your admin to resend it.'
              : msg,
          )
        },
      },
    )
  }

  const { ref: nameRef, ...nameRest } = register('name')
  const { ref: pwRef, ...pwRest } = register('password')
  const { ref: confirmRef, ...confirmRest } = register('confirmPassword')

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        You've been invited
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set your name and password to get started.
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Your name"
          autoComplete="name"
          fullWidth
          margin="normal"
          inputRef={nameRef}
          {...nameRest}
          error={!!errors.name}
          helperText={errors.name?.message}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          fullWidth
          margin="normal"
          inputRef={pwRef}
          {...pwRest}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          fullWidth
          margin="normal"
          inputRef={confirmRef}
          {...confirmRest}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={acceptInvite.isPending}
          sx={{ mt: 2, py: 1.2 }}
        >
          {acceptInvite.isPending ? <CircularProgress size={20} color="inherit" /> : 'Accept invite'}
        </Button>
      </Box>
    </Paper>
  )
}
