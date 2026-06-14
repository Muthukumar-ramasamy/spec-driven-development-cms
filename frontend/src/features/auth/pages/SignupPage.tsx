import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
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
import { useSignup } from '../hooks/useAuthMutations'
import { signupSchema, SignupFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const signup = useSignup()

  function onSubmit(values: SignupFormValues) {
    setServerError(null)
    signup.mutate(values, { onError: (err) => setServerError(getApiErrorMessage(err)) })
  }

  const { ref: orgRef, ...orgRest } = register('orgName')
  const { ref: nameRef, ...nameRest } = register('firstName')
  const { ref: emailRef, ...emailRest } = register('email')
  const { ref: pwRef, ...pwRest } = register('password')

  return (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
        SpecCRM
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        Create your workspace
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Company name"
          fullWidth
          margin="normal"
          inputRef={orgRef}
          {...orgRest}
          error={!!errors.orgName}
          helperText={errors.orgName?.message}
        />
        <TextField
          label="Your name"
          fullWidth
          margin="normal"
          inputRef={nameRef}
          {...nameRest}
          error={!!errors.firstName}
          helperText={errors.firstName?.message}
        />
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

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={signup.isPending}
          sx={{ mt: 2, py: 1.2 }}
        >
          {signup.isPending ? <CircularProgress size={20} color="inherit" /> : 'Create workspace'}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
        Already have an account?{' '}
        <Typography
          component={Link}
          to="/login"
          variant="body2"
          color="primary"
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Sign in
        </Typography>
      </Typography>
    </Paper>
  )
}
