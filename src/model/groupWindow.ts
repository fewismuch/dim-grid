export const GROUP_HEADER_HEIGHT = 34
export const groupGridHeight = (count: number, maxHeight = 400, rowHeight = 36): number =>
  Math.min(maxHeight, 38 + count * rowHeight + 1)
export function groupOffsets(
  groups: { key: string; rows: unknown[] }[],
  collapsed: Set<string>,
  maxGridHeight = 400,
  rowHeight = 36,
): number[] {
  const offsets = [0]
  for (const group of groups)
    offsets.push(
      offsets[offsets.length - 1] +
        GROUP_HEADER_HEIGHT +
        (collapsed.has(group.key) ? 0 : groupGridHeight(group.rows.length, maxGridHeight, rowHeight)),
    )
  return offsets
}
// Only groups intersecting the viewport and overscan have a mounted editor.
export function groupWindow(offsets: number[], scrollTop: number, height: number, overscan = 400) {
  const count = offsets.length - 1
  const total = offsets[count] ?? 0
  const top = Math.min(Math.max(0, scrollTop), Math.max(0, total - height))
  const lowerBound = (target: number) => {
    let low = 0
    let high = offsets.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (offsets[mid] <= target) low = mid + 1
      else high = mid
    }
    return low
  }
  const start = Math.max(0, lowerBound(Math.max(0, top - overscan)) - 1)
  const end = Math.min(count, lowerBound(top + height + overscan))
  return { start, end, before: offsets[start] ?? 0, after: total - (offsets[end] ?? total), total }
}
