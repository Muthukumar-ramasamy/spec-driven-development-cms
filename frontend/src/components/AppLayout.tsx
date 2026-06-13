import { Box, Drawer, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'

const DRAWER_WIDTH = 240

export function AppLayout() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            CRM
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
