import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { MoreVert } from '@mui/icons-material'
import { useAuth } from '../../../hooks/useAuth'
import type { Contact } from '../types'

interface Props {
  contacts: Contact[]
  onEdit: (contact: Contact) => void
  onDelete: (contactId: string) => void
}

export function ContactTable({ contacts, onEdit, onDelete }: Props) {
  const navigate = useNavigate()
  const authUser = useAuth()
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; contact: Contact } | null>(null)

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Job title</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/contacts/${contact.id}`)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'primary.light' }}>
                    {contact.firstName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>
                    {contact.firstName} {contact.lastName ?? ''}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {contact.email ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {contact.phone ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {contact.jobTitle ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={contact.ownerName} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor({ el: e.currentTarget, contact })}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor) onEdit(menuAnchor.contact)
            setMenuAnchor(null)
          }}
        >
          Edit
        </MenuItem>
        {authUser?.role === 'admin' && (
          <MenuItem
            onClick={() => {
              if (menuAnchor) onDelete(menuAnchor.contact.id)
              setMenuAnchor(null)
            }}
            sx={{ color: 'error.main' }}
          >
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
