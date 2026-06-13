import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { useUserMutations } from '../hooks/useUserMutations'
import { inviteMemberSchema, InviteMemberFormValues } from '../schemas'
import { getApiErrorMessage } from '../../../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

export function InviteMemberModal({ open, onClose }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'sales_rep' },
  })

  const { invite } = useUserMutations()

  function onSubmit(values: InviteMemberFormValues) {
    setServerError(null)
    invite.mutate(values, {
      onSuccess: () => {
        reset()
        onClose()
      },
      onError: (err) => {
        setServerError(getApiErrorMessage(err))
      },
    })
  }

  const { ref: emailRef, ...emailRest } = register('email')
  const { ref: nameRef, ...nameRest } = register('firstName')
  const { ref: roleRef, ...roleRest } = register('role')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite a team member</DialogTitle>
      <DialogContent>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" id="invite-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            margin="normal"
            inputRef={emailRef}
            {...emailRest}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            inputRef={nameRef}
            {...nameRest}
          />
          <TextField
            label="Role"
            select
            required
            fullWidth
            margin="normal"
            inputRef={roleRef}
            {...roleRest}
            error={!!errors.role}
            helperText={errors.role?.message}
            defaultValue="sales_rep"
          >
            <MenuItem value="sales_rep">Sales Rep</MenuItem>
            <MenuItem value="manager">Manager</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary">
            An invite email will be sent. Link expires in 72 hours.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          form="invite-form"
          variant="contained"
          disabled={invite.isPending}
          startIcon={invite.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Send invite
        </Button>
      </DialogActions>
    </Dialog>
  )
}
