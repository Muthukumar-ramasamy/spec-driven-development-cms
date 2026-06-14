// NotesFeed — embedded component for a record's Notes tab.
// Props: recordType ('deal' | 'contact' | 'company' | 'lead') + recordId (UUID).
// Does NOT render a standalone page; it is mounted inside a detail page's tab panel.

import React from 'react'
import { Alert, Box, CircularProgress, Divider, Typography } from '@mui/material'
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined'
import { NoteForm } from './NoteForm'
import { NoteCard } from './NoteCard'
import { useNotes } from '../hooks/useNotes'
import { useNoteMutations } from '../hooks/useNoteMutations'
import type { NoteRecordType } from '../types'
import type { CreateNoteInput } from '../schemas'

// ── props ──────────────────────────────────────────────────────────────────────

interface NotesFeedProps {
  recordType: NoteRecordType
  recordId: string
}

// ── helpers ────────────────────────────────────────────────────────────────────

function buildFilter(recordType: NoteRecordType, recordId: string) {
  return {
    dealId: recordType === 'deal' ? recordId : undefined,
    contactId: recordType === 'contact' ? recordId : undefined,
    companyId: recordType === 'company' ? recordId : undefined,
    leadId: recordType === 'lead' ? recordId : undefined,
    // Backend already returns pinned first (is_pinned DESC, created_at DESC)
    // so no explicit sort param is needed.
  }
}

// ── component ──────────────────────────────────────────────────────────────────

export function NotesFeed({ recordType, recordId }: NotesFeedProps) {
  const filter = buildFilter(recordType, recordId)
  const { data, isLoading, isError, refetch } = useNotes(filter)
  const { create, update, remove } = useNoteMutations()

  // ── create handler ─────────────────────────────────────────────────────────

  const handleCreate = async (values: CreateNoteInput) => {
    await create.mutateAsync(values)
  }

  // ── render: loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  // ── render: error ──────────────────────────────────────────────────────────

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Typography
            variant="caption"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => refetch()}
          >
            Retry
          </Typography>
        }
        sx={{ mt: 1 }}
      >
        Failed to load notes.
      </Alert>
    )
  }

  const notes = data?.data ?? []

  return (
    <Box>
      {/* Add-note form at the top of the feed */}
      <NoteForm
        recordType={recordType}
        recordId={recordId}
        onSubmit={handleCreate}
        isSubmitting={create.isPending}
      />

      <Divider sx={{ my: 2 }} />

      {/* Empty state */}
      {notes.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
            color: 'text.secondary',
            gap: 1,
          }}
        >
          <NoteAddOutlinedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">No notes yet. Add the first one above.</Typography>
        </Box>
      )}

      {/* Note list — pinned notes appear first (backend orders them) */}
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onUpdate={async (id, patch) => {
            await update.mutateAsync({ id, data: patch })
          }}
          onDelete={async (id) => {
            await remove.mutateAsync(id)
          }}
          isUpdating={update.isPending}
          isDeleting={remove.isPending}
        />
      ))}
    </Box>
  )
}
