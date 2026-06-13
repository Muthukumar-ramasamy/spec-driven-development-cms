import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420, px: 2 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
