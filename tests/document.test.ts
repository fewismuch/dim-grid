import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, HISTORY_LIMIT, historyReducer, historyState, initialDocument } from '../src/model/document.ts'
import { createRow } from '../src/model/table.ts'

const commit = (state, command, group = undefined, time = 1000) =>
  historyReducer(state, { type: 'commit', command, group, time })

test('deleting a field is one undoable transaction including view references and all values', () => {
  const doc = initialDocument()
  doc.view.groupBy.fieldId = 'f2'
  doc.view.filters = [{ id: 'filter', fieldId: 'f2', op: 'equals', value: '进行中' }]
  doc.view.hiddenFields.add('f2')
  doc.view.highlightDupes.add('f2')
  doc.view.colStats.f2 = '已填写数'
  const removed = commit(historyState(doc), { type: 'field/delete', id: 'f2' })
  assert.equal(removed.present.rows[0].f2, undefined)
  assert.equal(removed.present.view.groupBy.fieldId, '')
  assert.equal(removed.present.view.hiddenFields.size, 0)
  assert.equal(removed.past.length, 1)
  const restored = historyReducer(removed, { type: 'undo' })
  assert.deepEqual(restored.present, doc)
  assert.deepEqual(historyReducer(restored, { type: 'redo' }).present, removed.present)
  assert.equal(doc.rows[0].f2, '进行中')
})

test('incompatible type conversion is recoverable in one undo', () => {
  const doc = initialDocument()
  const edited = commit(historyState(doc), { type: 'field/save', field: { ...doc.fields[0], type: 'number' } })
  assert.equal(edited.present.rows[0].f1, null)
  assert.equal(historyReducer(edited, { type: 'undo' }).present.rows[0].f1, '任务 A')
})

test('new change after undo invalidates redo; edits to the same cell are coalesced', () => {
  const doc = initialDocument()
  let state = historyState(doc)
  const edit = (name) => ({
    type: 'rows/change',
    before: state.present.rows,
    after: state.present.rows.map((row, i) => (i === 0 ? { ...row, f1: name } : row)),
  })
  state = commit(state, edit('A'), 'cell:r1:f1', 1000)
  state = commit(state, edit('AB'), 'cell:r1:f1', 1200)
  assert.equal(state.past.length, 1)
  state = historyReducer(state, { type: 'undo' })
  assert.equal(state.present.rows[0].f1, '任务 A')
  state = commit(state, edit('新分支'), 'cell:r1:f1', 1300)
  assert.equal(state.future.length, 0)
})

test('history is bounded and invalid/no-op row commands create no history', () => {
  let state = historyState(initialDocument())
  assert.equal(commit(state, { type: 'rows/move', from: -1, to: 2 }), state)
  assert.equal(
    commit(state, { type: 'rows/change', before: state.present.rows, after: [...state.present.rows] }),
    state,
  )
  for (let i = 0; i < 80; i++) state = commit(state, { type: 'rows/add', row: createRow(state.present.fields) })
  assert.equal(state.past.length, HISTORY_LIMIT)
})

test('duplicating fields and creating default cells never mutate the original document', () => {
  const doc = initialDocument()
  const copy = applyCommand(doc, { type: 'field/duplicate', id: 'f2', newId: 'copy' })
  assert.equal(copy.rows[0].copy, '进行中')
  assert.equal(doc.rows[0].copy, undefined)
  assert.notEqual(copy.fields[2].options, doc.fields[1].options)
  const added = applyCommand(doc, {
    type: 'field/save',
    field: { id: 'new', label: '新列', type: 'checkbox' },
    index: 1,
  })
  assert.equal(added.fields[1].id, 'new')
  assert.equal(added.rows[0].new, false)
})

test('imported document can be undone without losing the previous table', () => {
  const original = initialDocument()
  const imported = { ...original, rows: [] }
  const state = commit(historyState(original), { type: 'document/replace', document: imported })
  assert.equal(state.present.rows.length, 0)
  assert.deepEqual(historyReducer(state, { type: 'undo' }).present, original)
})
