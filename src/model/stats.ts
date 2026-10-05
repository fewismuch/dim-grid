export const statKeys = [
  'none',
  'count',
  'filled',
  'empty',
  'unique',
  'filledPercent',
  'emptyPercent',
  'uniquePercent',
] as const
export type StatKey = (typeof statKeys)[number]

export const statLabels: Record<StatKey, string> = {
  none: '不展示',
  count: '记录总数',
  filled: '已填写数',
  empty: '未填写数',
  unique: '唯一数',
  filledPercent: '已填写占比',
  emptyPercent: '未填写占比',
  uniquePercent: '唯一数占比',
}

export function normalizeStat(value: string): StatKey {
  if (statKeys.includes(value as StatKey)) return value as StatKey
  return (Object.entries(statLabels).find(([, label]) => label === value)?.[0] as StatKey | undefined) ?? 'none'
}
