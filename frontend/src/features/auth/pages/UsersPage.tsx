import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, MoreVertical, UserPlus } from 'lucide-react'
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

const STATUS_BADGE: Record<UserStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  deactivated: { label: 'Deactivated', className: 'bg-red-100 text-red-800' },
}

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  sales_rep: 'bg-gray-100 text-gray-800',
}

export default function UsersPage() {
  const authUser = useAuth()

  // Admin only — redirect non-admins
  if (!authUser || authUser.role !== 'admin') {
    return <Navigate to="/deals" replace />
  }

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Settings › Team</p>
          <h1 className="text-xl font-semibold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {users.length} members ({activeCount} active · {pendingCount} pending ·{' '}
            {deactivatedCount} deactivated)
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus size={16} />
          Invite member
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="sales_rep">Sales Rep</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {isError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load team members.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const isLastAdmin = user.role === 'admin' && adminCount <= 1
                const isSelf = user.id === authUser.sub
                const status = STATUS_BADGE[user.status]

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                          {user.firstName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName ?? ''}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {changingRole === user.id ? (
                        <select
                          defaultValue={user.role}
                          autoFocus
                          onBlur={() => setChangingRole(null)}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="sales_rep">Sales Rep</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenu === user.id && (
                          <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                            {user.status === 'active' && (
                              <>
                                <button
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => {
                                    setOpenMenu(null)
                                    setChangingRole(user.id)
                                  }}
                                >
                                  Change role
                                </button>
                                {!isSelf && (
                                  <button
                                    disabled={isLastAdmin}
                                    title={
                                      isLastAdmin
                                        ? 'Cannot deactivate the last admin. Assign another admin first.'
                                        : undefined
                                    }
                                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => {
                                      setOpenMenu(null)
                                      setDeactivateTarget(user)
                                    }}
                                  >
                                    Deactivate
                                  </button>
                                )}
                              </>
                            )}
                            {user.status === 'pending' && (
                              <button
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setOpenMenu(null)
                                  resendInvite.mutate(user.id)
                                }}
                              >
                                Resend invite
                              </button>
                            )}
                            {user.status === 'deactivated' && (
                              <button
                                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setOpenMenu(null)
                                  handleReactivate(user.id)
                                }}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  )
}
