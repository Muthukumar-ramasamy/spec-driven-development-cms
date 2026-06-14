// NoteCard — displays a single note with optional edit / delete controls.
// Edit / delete are HIDDEN (not disabled) when the user lacks permission.

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Card,
  CardContent,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import { editNoteContentSchema } from '../schemas'
import type { EditNoteContentInput, UpdateNoteInput } from '../schemas'
import type { Note } from '../types'
import { useAuth } from '../../../hooks/useAuth'
import { getApiErrorMessage } from '../../../lib/api'

// ── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// ── props ─────────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note
  onUpdate: (id: string, data: UpdateNoteInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isUpdating: boolean
  isDeleting: boolean
  'data-testid'?: string
}

// ── component ─────────────────────────────────────────────────────────────────

export function NoteCard({ note, onUpdate, onDelete, isUpdating, isDeleting, 'data-testid': testId }: NoteCardProps) {
  const user = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Permission: author OR admin can edit/delete; pin follows same rule.
  const canEditOrDelete =
    user !== null && (user.sub === note.authorId || user.role === 'admin')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditNoteContentInput>({
    resolver: zodResolver(editNoteContentSchema),
    defaultValues: { content: note.content },
  })

  // ── edit handlers ──────────────────────────────────────────────────────────

  const handleEditClick = () => {
    reset({ content: note.content })
    setApiError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setApiError(null)
  }

  const handleSaveEdit = handleSubmit(async (values) => {
    try {
      await onUpdate(note.id, { content: values.content })
      setIsEditing(false)
      setApiError(null)
    } catch (err: unknown) {
      setApiError(getApiErrorMessage(err))
    }
  })

  // ── pin handler ────────────────────────────────────────────────────────────

  const handlePinToggle = async () => {
    try {
      await onUpdate(note.id, { isPinned: !note.isPinned })
    } catch (err: unknown) {
      setApiError(getApiErrorMessage(err))
    }
  }

  // ── delete handlers ────────────────────────────────────────────────────────

  const handleDeleteClick = () => {
    setConfirmDelete(true)
    setApiError(null)
  }

  const handleCancelDelete = () => setConfirmDelete(false)

  const handleConfirmDelete = async () => {
    try {
      await onDelete(note.id)
    } catch (err: unknown) {
      setConfirmDelete(false)
      setApiError(getApiErrorMessage(err))
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Card
      variant="outlined"
      data-testid={testId ?? 'note-card'}
      sx={{
        mb: 1.5,
        borderLeft: note.isPinned ? '3px solid' : '1px solid',
        borderLeftColor: note.isPinned ? 'primary.main' : 'divider',
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header row: author + timestamp + action icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} data-testid="note-author-badge">
              {note.authorName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {relativeTime(note.createdAt)}
            </Typography>
            {note.isPinned && (
              <Typography variant="caption" color="primary" fontWeight={600}>
                Pinned
              </Typography>
            )}
          </Box>

          {/* Action icons — HIDDEN for users who lack permission */}
          {canEditOrDelete && !isEditing && !confirmDelete && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={note.isPinned ? 'Unpin' : 'Pin'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={handlePinToggle}
                    disabled={isUpdating}
                    aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                  >
                    {note.isPinned ? (
                      <PushPinIcon fontSize="small" color="primary" />
                    ) : (
                      <PushPinOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Edit">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleEditClick}
                    aria-label="Edit note"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Delete">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleDeleteClick}
                    aria-label="Delete note"
                    color="error"
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Note body — editing or display */}
        {isEditing ? (
          <Box component="form" onSubmit={handleSaveEdit} noValidate sx={{ mt: 1 }}>
            <TextField
              {...register('content')}
              multiline
              minRows={3}
              fullWidth
              autoFocus
              error={Boolean(errors.content)}
              helperText={errors.content?.message}
              inputProps={{ 'aria-label': 'Edit note content' }}
            />
            {apiError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {apiError}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={handleCancelEdit} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                size="small"
                type="submit"
                variant="contained"
                disabled={isUpdating}
                startIcon={isUpdating ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {isUpdating ? 'Saving…' : 'Save'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {note.content}
          </Typography>
        )}

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <Box
            sx={{
              mt: 1,
              p: 1,
              bgcolor: 'error.lighter',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="body2" color="error.dark" sx={{ flexGrow: 1 }}>
              Delete this note?
            </Typography>
            <Button size="small" onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={14} color="inherit" /> : null}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </Box>
        )}

        {/* API error for pin / delete */}
        {apiError && !isEditing && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            {apiError}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
