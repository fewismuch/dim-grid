export type RowHeight = 'low' | 'medium' | 'high'

export const ROW_HEIGHT: Record<RowHeight, { pixels: number; lines: 1 | 2 | 5 }> = {
  low: { pixels: 36, lines: 1 },
  medium: { pixels: 56, lines: 2 },
  high: { pixels: 116, lines: 5 },
}
