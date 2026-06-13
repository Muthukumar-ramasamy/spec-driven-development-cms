import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { MoreVert, PersonAdd } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useUsers } from '../hooks/useUsers'
import { useUserMutations } from '../hooks/useUserMutations'
import { InviteMemberModal } from '../components/InviteMemberModal'
import { DeactivateConfirmDialog } from '../components/DeactivateConfirmDialog'
import type { User, UserRole, UserStatus } from '../types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  sales_rep: 'Sales Rep',
}

const STATUS_COLOR: Record<UserStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  deactivated: 'error',
}

const ROLE_COLOR: Record<UserRole, 'secondary' | 'primary' | 'default'> = {
  admin: 'secondary',
  manager: 'primary',
  sales_rep: 'default',
}

export default function UsersPage() {
  const authUser = useAuth()

  if (!authUser || authUser.role !== 'admin') {
    return <Navigate to="/deals" replace />
  }

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; userId: string } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const { data, isLoading, isError } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  })

  const { updateUser, deactivate, resendInvite } = useUserMutations()

  const users = data?.data ?? []
  const activeCount = users.filter((u) => u.status === 'active').length
  const pendingCount = users.filter((u) => u.status === 'pending').length
  const deactivatedCount = users.filter((u) => u.status === 'deactivated').length
  const adminCount = users.filter((u) => u.role === 'admin' && u.status === 'active').length

  function handleRoleChange(userId: string, newRole: UserRole) {
    updateUser.mutate({ userId, data: { role: newRole } }, {
      onSettled: () => setChangingRole(null),
    })
  }

  function handleReactivate(userId: string) {
    updateUser.mutate({ userId, data: { status: 'active' } })
  }

  const menuUser = menuAnchor ? users.find((u) => u.id === menuAnchor.userId) : null

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Settings › Team</Typography>
          <Typography variant="h6" fontWeight={600}>Team</Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length} members ({activeCount} active · {pendingCount} pending · {deactivatedCount} deactivated)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setInviteOpen(true)}
          size="small"
        >
          Invite member
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
        />
        <Select
          size="small"
          displayEmpty
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="manager">Manager</MenuItem>
          <MenuItem value="sales_rep">Sales Rep</MenuItem>
        </Select>
        <Select
          size="small"
          displayEmpty
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="deactivated">Deactivated</MenuItem>
        </Select>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Failed to load team members.</Alert>
      )}

      {!isLoading && !isError && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isLastAdmin = user.role === 'admin' && adminCount <= 1
                const isSelf = user.id === authUser.sub

                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.light' }}>
                          {user.firstName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>
                          {user.firstName} {user.lastName ?? ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {changingRole === user.id ? (
                        <Select
                          size="small"
                          defaultValue={user.role}
                          autoFocus
                          onBlur={() => setChangingRole(null)}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          sx={{ fontSize: 13 }}
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                          <MenuItem value="sales_rep">Sales Rep</MenuItem>
                        </Select>
                      ) : (
                        <Chip
                          label={ROLE_LABELS[user.role]}
                          color={ROLE_COLOR[user.role]}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        color={STATUS_COLOR[user.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => setMenuAnchor({ el: e.currentTarget, userId: user.id })}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuUser?.status === 'active' && [
          <MenuItem
            key="change-role"
            onClick={() => {
              setMenuAnchor(null)
              setChangingRole(menuUser.id)
            }}
          >
            Change role
          </MenuItem>,
          !menuUser || menuUser.id === authUser.sub ? null : (
            <MenuItem
              key="deactivate"
              disabled={menuUser.role === 'admin' && adminCount <= 1}
              onClick={() => {
                setMenuAnchor(null)
                setDeactivateTarget(menuUser)
              }}
              sx={{ color: 'error.main' }}
            >
              Deactivate
            </MenuItem>
          ),
        ]}
        {menuUser?.status === 'pending' && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              resendInvite.mutate(menuUser.id)
            }}
          >
            Resend invite
          </MenuItem>
        )}
        {menuUser?.status === 'deactivated' && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              handleReactivate(menuUser.id)
            }}
          >
            Reactivate
          </MenuItem>
        )}
      </Menu>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {deactivateTarget && (
        <DeactivateConfirmDialog
          user={deactivateTarget}
          isLastAdmin={deactivateTarget.role === 'admin' && adminCount <= 1}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={() => {
            deactivate.mutate(deactivateTarget.id)
            setDeactivateTarget(null)
          }}
        />
      )}
    </Box>
  )
}
