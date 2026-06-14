import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { AddOutlined, CheckCircle } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { ActivityTypeIcon } from '../components/ActivityTypeIcon'
import { ActivityForm } from '../components/ActivityForm'
import { MarkDoneModal } from '../components/MarkDoneModal'
import type { Activity } from '../types'

// ---------------------------------------------------------------------------
// Date helpers — no external library dependency
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function offsetDateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Get Monday of the week containing a given date string (YYYY-MM-DD)
function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon, …
  const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// Get Sunday of the week containing a given date string (YYYY-MM-DD)
function getSunday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

type UrgencyGroup =
  | 'Overdue'
  | 'Today'
  | 'Tomorrow'
  | 'This Week'
  | 'Next Week'
  | 'Later'
  | 'No due date'

const GROUP_ORDER: UrgencyGroup[] = [
  'Overdue',
  'Today',
  'Tomorrow',
  'This Week',
  'Next Week',
  'Later',
  'No due date',
]

function classifyTask(activity: Activity, today: string): UrgencyGroup {
  const due = activity.dueDate
  if (!due) return 'No due date'
  if (due < today) return 'Overdue'
  if (due === today) return 'Today'
  if (due === offsetDateStr(1)) return 'Tomorrow'

  const thisMonday = getMonday(today)
  const thisSunday = getSunday(today)
  const nextMonday = getMonday(offsetDateStr(7))
  const nextSunday = getSunday(offsetDateStr(7))

  if (due >= thisMonday && due <= thisSunday) return 'This Week'
  if (due >= nextMonday && due <= nextSunday) return 'Next Week'
  return 'Later'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Task row component
// ---------------------------------------------------------------------------
interface TaskRowProps {
  activity: Activity
  group: UrgencyGroup
  isManagerView: boolean
  onMarkDone: (a: Activity) => void
}

function TaskRow({ activity, group, isManagerView, onMarkDone }: TaskRowProps) {
  const isOverdue = group === 'Overdue'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 1,
        flexWrap: 'wrap',
        ...(isOverdue
          ? { borderLeft: '3px solid', borderColor: 'error.main', bgcolor: 'error.light', opacity: 0.9 }
          : {}),
      }}
    >
      <ActivityTypeIcon type={activity.type} fontSize="small" />

      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 120 }} noWrap>
        {activity.subject}
      </Typography>

      {/* Linked record pill — show raw UUID since we don't have name resolution yet */}
      {(activity.dealId || activity.contactId || activity.companyId || activity.leadId) && (
        <Chip
          label={
            activity.dealId
              ? `Deal: ${activity.dealId.slice(0, 8)}…`
              : activity.contactId
              ? `Contact: ${activity.contactId.slice(0, 8)}…`
              : activity.companyId
              ? `Company: ${activity.companyId.slice(0, 8)}…`
              : `Lead: ${activity.leadId!.slice(0, 8)}…`
          }
          size="small"
          variant="outlined"
          sx={{ fontSize: 11 }}
        />
      )}

      {/* Owner chip — shown in manager/admin view */}
      {isManagerView && (
        <Chip label={activity.ownerName} size="small" variant="outlined" sx={{ fontSize: 11 }} />
      )}

      {/* Due date */}
      {activity.dueDate && (
        <Typography
          variant="caption"
          color={isOverdue ? 'error.dark' : 'text.secondary'}
          fontWeight={isOverdue ? 600 : 400}
        >
          {isOverdue ? 'Was due ' : 'Due '}
          {formatDate(activity.dueDate)}
        </Typography>
      )}

      <Button
        size="small"
        variant="outlined"
        color="success"
        startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
        sx={{ fontSize: 11, py: 0.25, px: 1, ml: 'auto' }}
        onClick={() => onMarkDone(activity)}
      >
        Mark done
      </Button>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MyTasksPage() {
  const authUser = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [markDoneTarget, setMarkDoneTarget] = useState<Activity | null>(null)
  const [ownerFilter, setOwnerFilter] = useState<string>('')

  const isManagerOrAdmin =
    authUser?.role === 'admin' || authUser?.role === 'manager'

  // Sales reps see only their own tasks; managers/admins can see all or filter by owner
  const filters = {
    done: false,
    limit: 500,
    sort: 'due_date',
    order: 'asc' as const,
    // Sales reps are hard-scoped to their own tasks; managers pass optional owner filter
    ...(!isManagerOrAdmin && authUser ? { ownerId: authUser.sub } : {}),
    ...(isManagerOrAdmin && ownerFilter ? { ownerId: ownerFilter } : {}),
  }

  const { data, isLoading, isError, refetch } = useActivities(filters)

  const today = todayStr()
  const tasks = data?.data ?? []

  // Group tasks by urgency
  const grouped: Record<UrgencyGroup, Activity[]> = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    'This Week': [],
    'Next Week': [],
    Later: [],
    'No due date': [],
  }
  for (const task of tasks) {
    const group = classifyTask(task, today)
    grouped[group].push(task)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          My Tasks
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Owner filter — shown only to managers/admins */}
          {isManagerOrAdmin && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by owner</InputLabel>
              <Select
                label="Filter by owner"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <MenuItem value="">All team members</MenuItem>
                {/* In a real app this would be populated from a users list query.
                    For now the select is wired but items would be added when the
                    users API hook is available. */}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setFormOpen(true)}
          >
            + New task
          </Button>
        </Box>
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {isError && (
        <Alert
          severity="error"
          action={<Button size="small" onClick={() => refetch()}>Retry</Button>}
          sx={{ mb: 2 }}
        >
          Failed to load tasks. Please try again.
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !isError && tasks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No open tasks. You're all caught up!
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddOutlined />}
            sx={{ mt: 1 }}
            onClick={() => setFormOpen(true)}
          >
            Create a task
          </Button>
        </Box>
      )}

      {/* Task groups */}
      {!isLoading && !isError && tasks.length > 0 && (
        <Box>
          {GROUP_ORDER.map((groupName) => {
            const groupTasks = grouped[groupName]
            if (groupTasks.length === 0) return null

            return (
              <Box key={groupName} sx={{ mb: 3 }}>
                {/* Group header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography
                    variant="overline"
                    color={groupName === 'Overdue' ? 'error.main' : 'text.secondary'}
                    fontWeight={700}
                  >
                    {groupName}
                  </Typography>
                  <Chip
                    label={groupTasks.length}
                    size="small"
                    color={groupName === 'Overdue' ? 'error' : 'default'}
                    sx={{ height: 18, fontSize: 11 }}
                  />
                </Box>

                {/* Task rows */}
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  {groupTasks.map((task, idx) => (
                    <Box key={task.id}>
                      <TaskRow
                        activity={task}
                        group={groupName}
                        isManagerView={isManagerOrAdmin}
                        onMarkDone={(a) => setMarkDoneTarget(a)}
                      />
                      {idx < groupTasks.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {/* Activity form drawer */}
      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} />

      {/* Mark done modal */}
      {markDoneTarget && (
        <MarkDoneModal
          open={markDoneTarget !== null}
          onClose={() => setMarkDoneTarget(null)}
          activityId={markDoneTarget.id}
          activitySubject={markDoneTarget.subject}
        />
      )}
    </Box>
  )
}
