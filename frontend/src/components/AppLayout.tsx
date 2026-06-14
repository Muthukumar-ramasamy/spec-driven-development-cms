import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { PeopleOutlined, BusinessOutlined, TrendingUpOutlined, PieChartOutlined, CheckCircleOutlined, LogoutOutlined, BarChartOutlined } from '@mui/icons-material'
import { useLogout } from '../features/auth/hooks/useAuthMutations'
import { useAuth } from '../hooks/useAuth'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { label: 'Contacts', path: '/contacts', icon: <PeopleOutlined fontSize="small" /> },
  { label: 'Companies', path: '/companies', icon: <BusinessOutlined fontSize="small" /> },
  { label: 'Leads', path: '/leads', icon: <TrendingUpOutlined fontSize="small" /> },
  { label: 'Deals', path: '/deals', icon: <PieChartOutlined fontSize="small" /> },
  { label: 'Tasks', path: '/tasks', icon: <CheckCircleOutlined fontSize="small" /> },
  { label: 'Reports', path: '/reports', icon: <BarChartOutlined fontSize="small" /> },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useLogout()
  const user = useAuth()

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
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            CRM
          </Typography>
        </Box>

        <List sx={{ flex: 1, py: 1 }}>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          ))}
        </List>

        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', display: 'block', mb: 1 }}>
            {user?.role?.replace('_', ' ') ?? ''}
          </Typography>
          <ListItemButton
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            sx={{ borderRadius: 1, px: 1, py: 0.75, color: 'error.main' }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
              <LogoutOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Log out" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
          </ListItemButton>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
