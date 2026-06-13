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
import type { Company } from '../types'

interface Props {
  companies: Company[]
  onEdit: (company: Company) => void
  onDelete: (companyId: string) => void
}

export function CompanyTable({ companies, onEdit, onDelete }: Props) {
  const navigate = useNavigate()
  const authUser = useAuth()
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; company: Company } | null>(null)

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Website</TableCell>
            <TableCell>Industry</TableCell>
            <TableCell>Employees</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {companies.map((company) => (
            <TableRow
              key={company.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/companies/${company.id}`)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'secondary.light' }}>
                    {company.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>
                    {company.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {company.website ? (
                    <Box
                      component="a"
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {company.website}
                    </Box>
                  ) : (
                    '—'
                  )}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {company.industry ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {company.employeeCount != null ? company.employeeCount.toLocaleString() : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={company.ownerName} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor({ el: e.currentTarget, company })}
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
            if (menuAnchor) onEdit(menuAnchor.company)
            setMenuAnchor(null)
          }}
        >
          Edit
        </MenuItem>
        {authUser?.role === 'admin' && (
          <MenuItem
            onClick={() => {
              if (menuAnchor) onDelete(menuAnchor.company.id)
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
