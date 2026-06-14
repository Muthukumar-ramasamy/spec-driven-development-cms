import { Tooltip } from '@mui/material'
import {
  PhoneOutlined,
  EmailOutlined,
  GroupsOutlined,
  PresentToAllOutlined,
  RestaurantOutlined,
  EventNoteOutlined,
} from '@mui/icons-material'
import { ACTIVITY_TYPE_LABELS } from '../schemas'
import type { ActivityType } from '../types'

interface Props {
  type: ActivityType
  fontSize?: 'small' | 'medium' | 'large' | 'inherit'
}

const ICON_MAP: Record<ActivityType, React.ElementType> = {
  call: PhoneOutlined,
  email: EmailOutlined,
  meeting: GroupsOutlined,
  demo: PresentToAllOutlined,
  lunch: RestaurantOutlined,
  other: EventNoteOutlined,
}

export function ActivityTypeIcon({ type, fontSize = 'small' }: Props) {
  const Icon = ICON_MAP[type]
  const label = ACTIVITY_TYPE_LABELS[type]

  return (
    <Tooltip title={label} arrow>
      <Icon fontSize={fontSize} aria-label={label} />
    </Tooltip>
  )
}
