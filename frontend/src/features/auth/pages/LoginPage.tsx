import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
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
import { useAuth } from '../../../hooks/useAuth'
import { useLogin } from '../hooks/useAuthMutations'
import { loginSchema, LoginFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

export default function LoginPage() {
  const user = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  if (user) {
    navigate('/deals', { replace: true })
    return null
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const login = useLogin()

  function onSubmit(values: LoginFormValues) {
    setServerError(null)
    login.mutate(values, { onError: (err) => setServerError(getApiErrorMessage(err)) })
  }

  const { ref: emailRef, ...emailRest } = register('email')
  const { ref: passwordRef, ...passwordRest } = register('password')

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
        CRM
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Sign in to your workspace
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

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

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          fullWidth
          margin="normal"
          inputRef={passwordRef}
          {...passwordRest}
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

        <Box sx={{ textAlign: 'right', mt: -0.5, mb: 1 }}>
          <Typography
            component={Link}
            to="/forgot-password"
            variant="caption"
            color="primary"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Forgot password?
          </Typography>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={login.isPending}
          sx={{ mt: 1, py: 1.2 }}
        >
          {login.isPending ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
        Don't have an account?{' '}
        <Typography
          component={Link}
          to="/signup"
          variant="body2"
          color="primary"
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Sign up
        </Typography>
      </Typography>
    </Paper>
  )
}
