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
import { useResetPassword } from '../hooks/useAuthMutations'
import { resetPasswordSchema, ResetPasswordFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  const resetPassword = useResetPassword()

  if (!token) {
    return (
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          This link is invalid or has expired.
        </Alert>
        <Button component={Link} to="/forgot-password" variant="text">
          Request a new link
        </Button>
      </Paper>
    )
  }

  function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)
    resetPassword.mutate(
      { token, password: values.password },
      { onError: (err) => setServerError(getApiErrorMessage(err)) },
    )
  }

  const { ref: pwRef, ...pwRest } = register('password')
  const { ref: confirmRef, ...confirmRest } = register('confirmPassword')

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
        Choose a new password
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="New password"
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
          disabled={resetPassword.isPending}
          sx={{ mt: 2, py: 1.2 }}
        >
          {resetPassword.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save new password'}
        </Button>
      </Box>
    </Paper>
  )
}
