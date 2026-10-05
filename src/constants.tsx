import {
  BarChartOutlined,
  BlockOutlined,
  CalendarOutlined,
  CheckOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  HistoryOutlined,
  HolderOutlined,
  LinkOutlined,
  MailOutlined,
  NumberOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  SwapOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { ComponentType, FC } from 'react'

export type {
  FieldDef,
  FieldOption,
  FieldType,
  FilterItem,
  GroupByState,
  ModalState,
  RowData,
  SortItem,
} from './model/table'
export { calcStat, newId } from './model/table'

import type { FieldType } from './model/table'

const iconStyle = (size: number) => ({ fontSize: size })

type IconComponent = FC<{ style?: React.CSSProperties }>

const icon =
  (Comp: ComponentType<any>, size: number): IconComponent =>
  (props) => <Comp {...props} style={{ ...iconStyle(size), ...props?.style }} />

export const Ic = {
  Table: icon(TableOutlined, 16),
  Filter: icon(FilterOutlined, 14),
  Group: icon(BlockOutlined, 14),
  Sort: icon(SwapOutlined, 14),
  Search: icon(SearchOutlined, 13),
  Plus: icon(PlusOutlined, 14),
  X: icon(CloseOutlined, 14),
  Settings: icon(SettingOutlined, 13),
  Trash: icon(DeleteOutlined, 13),
  ChevD: icon(DownOutlined, 12),
  ChevR: icon(RightOutlined, 12),
  Text: icon(FontSizeOutlined, 14),
  Hash: icon(NumberOutlined, 14),
  Cal: icon(CalendarOutlined, 14),
  Check: icon(CheckOutlined, 14),
  List: icon(UnorderedListOutlined, 14),
  CheckSquare: icon(CheckSquareOutlined, 14),
  CreatedTime: icon(ClockCircleOutlined, 14),
  ModifiedTime: icon(HistoryOutlined, 14),
  Mail: icon(MailOutlined, 14),
  Star: icon(StarOutlined, 14),
  Progress: icon(BarChartOutlined, 14),
  GripVertical: icon(HolderOutlined, 14),
  Eye: icon(EyeOutlined, 14),
  EyeOff: icon(EyeInvisibleOutlined, 14),
  Link: icon(LinkOutlined, 14),
  ExtLink: icon(ExportOutlined, 13),
  Edit: icon(EditOutlined, 14),
} satisfies Record<string, IconComponent>

export interface FieldTypeDef {
  key: FieldType
  label: string
  Icon: IconComponent
  section: string
}

export const FIELD_TYPES: FieldTypeDef[] = [
  { key: 'text', label: '文本', Icon: Ic.Text as IconComponent, section: '基础' },
  { key: 'number', label: '数字', Icon: Ic.Hash as IconComponent, section: '基础' },
  { key: 'select', label: '单选', Icon: DownCircleOutlined as IconComponent, section: '基础' },
  { key: 'multi_select', label: '多选', Icon: Ic.List as IconComponent, section: '基础' },
  { key: 'link', label: '链接', Icon: Ic.Link as IconComponent, section: '基础' },
  { key: 'date', label: '日期', Icon: Ic.Cal as IconComponent, section: '基础' },
  { key: 'checkbox', label: '复选框', Icon: Ic.CheckSquare as IconComponent, section: '基础' },
  { key: 'email', label: '邮箱', Icon: Ic.Mail as IconComponent, section: '基础' },
  { key: 'float', label: '小数', Icon: Ic.Hash as IconComponent, section: '基础' },
  { key: 'rating', label: '评分', Icon: Ic.Star as IconComponent, section: '基础' },
  { key: 'progress', label: '进度', Icon: Ic.Progress as IconComponent, section: '基础' },
  { key: 'created_time', label: '新建时间', Icon: Ic.CreatedTime as IconComponent, section: '高级' },
  { key: 'modified_time', label: '修改时间', Icon: Ic.ModifiedTime as IconComponent, section: '高级' },
]

export const OPT_COLORS = [
  '#e8f8f0',
  '#e8f0fe',
  '#fef3d0',
  '#fde8e8',
  '#f3e8ff',
  '#9ae6c3',
  '#a3c9ff',
  '#fde59e',
  '#fca5a5',
  '#c4b5fd',
  '#00b96b',
  '#2d7bf4',
  '#f59e0b',
  '#f54a45',
  '#8b5cf6',
  '#0a6640',
  '#1a3a8f',
  '#7a5800',
  '#8f1a1a',
  '#5b1a8f',
]
export const OPT_TEXT_COLORS = [
  '#0a6640',
  '#1a3a8f',
  '#7a5800',
  '#8f1a1a',
  '#5b1a8f',
  '#0a6640',
  '#1a3a8f',
  '#7a5800',
  '#8f1a1a',
  '#5b1a8f',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
  '#fff',
]
