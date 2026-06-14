// NoteForm — inline textarea used to add a new note.
// Renders at the top of NotesFeed; not a modal/drawer.

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { createNoteSchema } from '../schemas'
import type { CreateNoteInput } from '../schemas'
import type { NoteRecordType } from '../types'
import { getApiErrorMessage } from '../../../lib/api'

interface NoteFormProps {
  recordType: NoteRecordType
  recordId: string
  onSuccess?: () => void
  onSubmit: (data: CreateNoteInput) => Promise<void>
  isSubmitting: boolean
}

export function NoteForm({
  recordType,
  recordId,
  onSuccess,
  onSubmit,
  isSubmitting,
}: NoteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      content: '',
      isPinned: false,
      // Pre-populate the linked record so AC-02 is satisfied server-side.
      dealId: recordType === 'deal' ? recordId : undefined,
      contactId: recordType === 'contact' ? recordId : undefined,
      companyId: recordType === 'company' ? recordId : undefined,
      leadId: recordType === 'lead' ? recordId : undefined,
    },
  })

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      reset()
      onSuccess?.()
    } catch (err: unknown) {
      setError('root', { message: getApiErrorMessage(err) })
    }
  })

  return (
    <Box component="form" onSubmit={handleFormSubmit} noValidate>
      <TextField
        {...register('content')}
        label="Add a note"
        placeholder="Type your note here…"
        multiline
        minRows={3}
        fullWidth
        error={Boolean(errors.content)}
        helperText={errors.content?.message}
        inputProps={{ 'aria-label': 'Note content' }}
      />
      {errors.root && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {errors.root.message}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving…' : 'Save note'}
        </Button>
      </Box>
    </Box>
  )
}
