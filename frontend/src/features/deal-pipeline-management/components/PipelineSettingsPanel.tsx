import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Delete, Save } from '@mui/icons-material'
import { AxiosError } from 'axios'
import { useStageMutations } from '../hooks/useStageMutations'
import { getApiErrorMessage } from '../../../lib/api'
import type { PipelineStage } from '../types'

interface Props {
  stages: PipelineStage[]
  openDealCountByStage: Record<string, number>
}

export function PipelineSettingsPanel({ stages, openDealCountByStage }: Props) {
  const [editedStages, setEditedStages] = useState<Record<string, { name: string; probability: string }>>({})
  const [newStageName, setNewStageName] = useState('')
  const [newStageProbability, setNewStageProbability] = useState('0')
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { create, update, remove, reorder } = useStageMutations()

  const sortedStages = stages.slice().sort((a, b) => a.displayOrder - b.displayOrder)

  function getEditedName(stage: PipelineStage) {
    return editedStages[stage.id]?.name ?? stage.name
  }

  function getEditedProbability(stage: PipelineStage) {
    return editedStages[stage.id]?.probability ?? String(stage.probability)
  }

  function handleNameChange(id: string, value: string) {
    setEditedStages((prev) => ({
      ...prev,
      [id]: { ...prev[id], name: value, probability: prev[id]?.probability ?? '' },
    }))
  }

  function handleProbabilityChange(id: string, value: string) {
    setEditedStages((prev) => ({
      ...prev,
      [id]: { ...prev[id], probability: value, name: prev[id]?.name ?? '' },
    }))
  }

  function handleSaveStage(stage: PipelineStage) {
    setError(null)
    const edited = editedStages[stage.id]
    if (!edited) return
    update.mutate(
      {
        id: stage.id,
        data: {
          name: edited.name || stage.name,
          probability: Number(edited.probability ?? stage.probability),
        },
      },
      {
        onError: (err: unknown) => {
          setError(getApiErrorMessage(err))
        },
      },
    )
  }

  function handleDelete(stage: PipelineStage) {
    setError(null)
    remove.mutate(stage.id, {
      onError: (err: unknown) => {
        if (err instanceof AxiosError) {
          setError(getApiErrorMessage(err))
        }
      },
    })
  }

  function handleSaveOrder() {
    setError(null)
    const ordered = sortedStages.map((s, idx) => ({ id: s.id, displayOrder: idx + 1 }))
    reorder.mutate(ordered, {
      onError: (err: unknown) => setError(getApiErrorMessage(err)),
    })
  }

  function handleAddStage() {
    setError(null)
    if (!newStageName.trim()) {
      setError('Stage name is required.')
      return
    }
    create.mutate(
      { name: newStageName.trim(), probability: Number(newStageProbability) },
      {
        onSuccess: () => {
          setNewStageName('')
          setNewStageProbability('0')
          setShowAddForm(false)
        },
        onError: (err: unknown) => setError(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <List disablePadding>
        {sortedStages.map((stage, index) => {
          const hasOpenDeals = (openDealCountByStage[stage.id] ?? 0) > 0

          return (
            <Box key={stage.id}>
              <ListItem
                sx={{ px: 0, gap: 1.5, alignItems: 'center' }}
                secondaryAction={
                  <Tooltip
                    title={
                      hasOpenDeals
                        ? 'Cannot delete: stage has open deals'
                        : 'Delete stage'
                    }
                  >
                    <span>
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() => handleDelete(stage)}
                        disabled={hasOpenDeals || remove.isPending}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                }
              >
                <Typography variant="body2" sx={{ minWidth: 24, color: 'text.secondary' }}>
                  {index + 1}.
                </Typography>

                <TextField
                  size="small"
                  value={getEditedName(stage)}
                  onChange={(e) => handleNameChange(stage.id, e.target.value)}
                  sx={{ flex: 1 }}
                  label="Stage name"
                />

                <TextField
                  size="small"
                  type="number"
                  value={getEditedProbability(stage)}
                  onChange={(e) => handleProbabilityChange(stage.id, e.target.value)}
                  sx={{ width: 90 }}
                  label="Prob %"
                  inputProps={{ min: 0, max: 100 }}
                />

                <Tooltip title="Save changes">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleSaveStage(stage)}
                    disabled={!editedStages[stage.id] || update.isPending}
                  >
                    <Save fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItem>
              {index < sortedStages.length - 1 && <Divider />}
            </Box>
          )
        })}
      </List>

      {/* Add stage form */}
      {showAddForm && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="New stage name"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label="Prob %"
            value={newStageProbability}
            onChange={(e) => setNewStageProbability(e.target.value)}
            sx={{ width: 90 }}
            inputProps={{ min: 0, max: 100 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddStage}
            disabled={create.isPending}
            startIcon={create.isPending ? <CircularProgress size={12} color="inherit" /> : undefined}
          >
            Add
          </Button>
          <Button size="small" onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        {!showAddForm && (
          <Button variant="outlined" onClick={() => setShowAddForm(true)}>
            + Add stage
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={reorder.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
          onClick={handleSaveOrder}
          disabled={reorder.isPending}
        >
          Save order
        </Button>
      </Box>
    </Box>
  )
}
