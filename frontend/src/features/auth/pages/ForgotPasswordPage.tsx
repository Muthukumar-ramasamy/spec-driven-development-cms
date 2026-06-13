import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useForgotPassword } from '../hooks/useAuthMutations'
import { forgotPasswordSchema, ForgotPasswordFormValues } from '../schemas'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const forgotPassword = useForgotPassword()

  function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword.mutate(values, { onSuccess: () => setSubmitted(true) })
  }

  const { ref: emailRef, ...emailRest } = register('email')

  if (submitted) {
    return (
      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          If that email exists, a reset link is on its way.
        </Alert>
        <Button component={Link} to="/login" startIcon={<ArrowBack />} variant="text">
          Back to login
        </Button>
      </Paper>
    )
  }

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Reset your password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your email and we'll send you a reset link.
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          margin="normal"
          inputRef={emailRef}
          {...emailRest}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={forgotPassword.isPending}
          sx={{ mt: 2, py: 1.2 }}
        >
          {forgotPassword.isPending ? <CircularProgress size={20} color="inherit" /> : 'Send reset link'}
        </Button>
      </Box>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button component={Link} to="/login" startIcon={<ArrowBack />} variant="text" size="small">
          Back to login
        </Button>
      </Box>
    </Paper>
  )
}
