import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Typography, Container,
  Paper, AppBar, Toolbar,
} from '@mui/material'
import { logout } from '../api/auth'

export function DashboardPage() {
  const navigate = useNavigate()
  const raw = localStorage.getItem('crm_user')
  const user = raw ? (JSON.parse(raw) as { firstName: string; role: string }) : null

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            CRM
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.firstName} ({user?.role})
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Box sx={{ mt: 6 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Welcome, {user?.firstName ?? 'there'}!
            </Typography>
            <Typography color="text.secondary">
              You are signed in as <strong>{user?.role}</strong>. More features coming in Phase 2.
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  )
}
