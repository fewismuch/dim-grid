import {
  BarChartOutlined,
  BlockOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
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
import type { FC } from 'react'

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

export const Ic: Record<string, IconComponent> = {
  Table: (props) => <TableOutlined {...props} style={{ ...iconStyle(16), ...props?.style }} />,
  Filter: (props) => <FilterOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Group: (props) => <BlockOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Sort: (props) => <SwapOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Search: (props) => <SearchOutlined {...props} style={{ ...iconStyle(13), ...props?.style }} />,
  Plus: (props) => <PlusOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  X: (props) => <CloseOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Settings: (props) => <SettingOutlined {...props} style={{ ...iconStyle(13), ...props?.style }} />,
  Trash: (props) => <DeleteOutlined {...props} style={{ ...iconStyle(13), ...props?.style }} />,
  ChevD: (props) => <DownOutlined {...props} style={{ ...iconStyle(12), ...props?.style }} />,
  ChevR: (props) => <RightOutlined {...props} style={{ ...iconStyle(12), ...props?.style }} />,
  Text: (props) => <FontSizeOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Hash: (props) => <NumberOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Cal: (props) => <CalendarOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Check: (props) => <CheckOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  List: (props) => <UnorderedListOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Mail: (props) => <MailOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Star: (props) => <StarOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Progress: (props) => <BarChartOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  GripVertical: (props) => <HolderOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Eye: (props) => <EyeOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  EyeOff: (props) => <EyeInvisibleOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  Link: (props) => <LinkOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
  ExtLink: (props) => <ExportOutlined {...props} style={{ ...iconStyle(13), ...props?.style }} />,
  Edit: (props) => <EditOutlined {...props} style={{ ...iconStyle(14), ...props?.style }} />,
}

export interface FieldTypeDef {
  key: FieldType
  label: string
  Icon: IconComponent
  section: string
}

export const FIELD_TYPES: FieldTypeDef[] = [
  { key: 'text', label: '文本', Icon: Ic.Text as IconComponent, section: '基础' },
  { key: 'number', label: '数字', Icon: Ic.Hash as IconComponent, section: '基础' },
  { key: 'select', label: '单选', Icon: Ic.List as IconComponent, section: '基础' },
  { key: 'multi_select', label: '多选', Icon: Ic.Check as IconComponent, section: '基础' },
  { key: 'link', label: '链接', Icon: Ic.Link as IconComponent, section: '基础' },
  { key: 'date', label: '日期', Icon: Ic.Cal as IconComponent, section: '基础' },
  { key: 'checkbox', label: '复选框', Icon: Ic.Check as IconComponent, section: '基础' },
  { key: 'email', label: '邮箱', Icon: Ic.Mail as IconComponent, section: '基础' },
  { key: 'float', label: '小数', Icon: Ic.Hash as IconComponent, section: '基础' },
  { key: 'rating', label: '评分', Icon: Ic.Star as IconComponent, section: '基础' },
  { key: 'progress', label: '进度', Icon: Ic.Progress as IconComponent, section: '基础' },
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

export const STAT_OPTS = [
  '不展示',
  '记录总数',
  '已填写数',
  '未填写数',
  '唯一数',
  '已填写占比',
  '未填写占比',
  '唯一数占比',
]
