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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Deactivate {name}?</h2>
        <p className="mb-6 text-sm text-gray-600">
          {name} will lose access immediately. Their records will be preserved.
        </p>

        {isLastAdmin && (
          <p className="mb-4 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Cannot deactivate the last admin. Assign another admin first.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={isLastAdmin}
            onClick={onConfirm}
            title={
              isLastAdmin
                ? 'Cannot deactivate the last admin. Assign another admin first.'
                : undefined
            }
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}
