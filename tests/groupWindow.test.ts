import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupOffsets, groupWindow } from '../src/model/groupWindow.ts'
import { reconcileRows } from '../src/model/table.ts'

test('1000 groups only mount viewport and overscan rather than every grid', () => {
  const groups = Array.from({ length: 1000 }, (_, i) => ({ key: String(i), rows: [{}] }))
  const offsets = groupOffsets(groups, new Set())
  for (const top of [0, 5000, 40000, offsets.at(-1)]) {
    const window = groupWindow(offsets, top, 600)
    assert.ok(window.end - window.start < 25)
    assert.equal(window.before + (offsets[window.end] - offsets[window.start]) + window.after, offsets.at(-1))
  }
})

test('collapsed groups, empty lists and shortened content keep valid window bounds', () => {
  assert.deepEqual(groupWindow([0], 10000, 600), { start: 0, end: 0, before: 0, after: 0, total: 0 })
  const offsets = groupOffsets(
    [
      { key: 'a', rows: [{}] },
      { key: 'b', rows: [{}] },
    ],
    new Set(['a']),
  )
  assert.equal(offsets[1], 34)
  assert.equal(groupWindow(offsets, 10000, 600).start, 0)
})

test('bulk paste merges 10000 new records in order without shifting existing hidden records', () => {
  const hidden = { id: 'hidden' }
  const existing = { id: 'existing' }
  const added = Array.from({ length: 10000 }, (_, i) => ({ id: `new-${i}` }))
  const result = reconcileRows([existing, hidden], [existing], [existing, ...added])
  assert.equal(result.length, 10002)
  assert.deepEqual(result.slice(1, -1), added)
  assert.equal(result.at(-1), hidden)
})
