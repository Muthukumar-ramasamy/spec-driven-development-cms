import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import type { User } from '../types'

interface Props {
  user: User
  isLastAdmin: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeactivateConfirmDialog({ user, isLastAdmin, onClose, onConfirm }: Props) {
  const name = `${user.firstName} ${user.lastName ?? ''}`.trim()

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate {name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {name} will lose access immediately. Their records will be preserved.
        </DialogContentText>
        {isLastAdmin && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Cannot deactivate the last admin. Assign another admin first.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          disabled={isLastAdmin}
          onClick={onConfirm}
          variant="contained"
          color="error"
        >
          Deactivate
        </Button>
      </DialogActions>
    </Dialog>
  )
}
