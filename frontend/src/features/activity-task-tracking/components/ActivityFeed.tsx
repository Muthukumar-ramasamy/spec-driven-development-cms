import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  Typography,
} from '@mui/material'
import { AddOutlined, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import { useActivities } from '../hooks/useActivities'
import { ActivityTypeIcon } from './ActivityTypeIcon'
import { ActivityForm } from './ActivityForm'
import { MarkDoneModal } from './MarkDoneModal'
import type { Activity, LinkedRecord } from '../types'

interface Props {
  linkedRecord: LinkedRecord
  showAddButton?: boolean
}

// Format an ISO date string (or partial) to a readable short form
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Truncate notes preview to 120 chars
function truncate(text: string | null, maxLen = 120): string {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

function ActivityItem({
  activity,
  onMarkDone,
}: {
  activity: Activity
  onMarkDone: (a: Activity) => void
}) {
  return (
    <ListItem
      disablePadding
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        py: 1.5,
        px: 0,
      }}
    >
      {/* Top row: icon + subject + owner + done badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', flexWrap: 'wrap' }}>
        <ActivityTypeIcon type={activity.type} fontSize="small" />

        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
          {activity.subject}
        </Typography>

        {/* Owner */}
        <Chip label={activity.ownerName} size="small" variant="outlined" sx={{ fontSize: 11 }} />

        {/* Done/open badge */}
        {activity.done ? (
          <Chip
            icon={<CheckCircle sx={{ fontSize: 14 }} />}
            label="Done"
            size="small"
            color="success"
            sx={{ fontSize: 11 }}
          />
        ) : (
          <Chip
            icon={<RadioButtonUnchecked sx={{ fontSize: 14 }} />}
            label="Open"
            size="small"
            variant="outlined"
            sx={{ fontSize: 11 }}
          />
        )}
      </Box>

      {/* Second row: dates + notes preview + mark-done button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, width: '100%', flexWrap: 'wrap' }}>
        {activity.done && activity.doneAt && (
          <Typography variant="caption" color="text.secondary">
            Completed {formatDate(activity.doneAt)}
          </Typography>
        )}
        {!activity.done && activity.dueDate && (
          <Typography variant="caption" color="text.secondary">
            Due {formatDate(activity.dueDate)}
          </Typography>
        )}

        {activity.notes && (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {truncate(activity.notes)}
          </Typography>
        )}

        {/* Mark done — only shown for open tasks */}
        {!activity.done && (
          <Button
            size="small"
            variant="outlined"
            color="success"
            sx={{ ml: 'auto', fontSize: 11, py: 0.25, px: 1 }}
            onClick={() => onMarkDone(activity)}
          >
            Mark done
          </Button>
        )}
      </Box>
    </ListItem>
  )
}

export function ActivityFeed({ linkedRecord, showAddButton = true }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [markDoneTarget, setMarkDoneTarget] = useState<Activity | null>(null)

  // Build filter: set the appropriate FK field
  const filters = {
    [`${linkedRecord.type}Id`]: linkedRecord.id,
    sort: 'created_at',
    order: 'desc' as const,
    limit: 50,
  }

  const { data, isLoading, isError, refetch } = useActivities(filters)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Alert severity="error" action={
        <Button size="small" onClick={() => refetch()}>Retry</Button>
      }>
        Failed to load activities.
      </Alert>
    )
  }

  const activities = data?.data ?? []

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Activities ({activities.length})
        </Typography>
        {showAddButton && (
          <Button
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => setFormOpen(true)}
            variant="outlined"
          >
            Log activity
          </Button>
        )}
      </Box>

      {activities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No activities yet. Log one to get started.
          </Typography>
          {showAddButton && (
            <Button
              size="small"
              startIcon={<AddOutlined />}
              sx={{ mt: 1.5 }}
              variant="outlined"
              onClick={() => setFormOpen(true)}
            >
              Log activity
            </Button>
          )}
        </Box>
      ) : (
        <List disablePadding>
          {activities.map((activity, idx) => (
            <Box key={activity.id}>
              <ActivityItem
                activity={activity}
                onMarkDone={(a) => setMarkDoneTarget(a)}
              />
              {idx < activities.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}

      {/* Activity form drawer — pre-filled with this record's link */}
      <ActivityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        linkedRecord={linkedRecord}
      />

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
