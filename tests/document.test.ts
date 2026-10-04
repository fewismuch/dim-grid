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
  doc.view.pinnedFieldId = 'f2'
  const removed = commit(historyState(doc), { type: 'field/delete', id: 'f2' })
  assert.equal(removed.present.rows[0].f2, undefined)
  assert.equal(removed.present.view.groupBy.fieldId, '')
  assert.equal(removed.present.view.pinnedFieldId, '')
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

test('column resize is undoable without altering its cells', () => {
  const doc = initialDocument()
  const resized = commit(historyState(doc), { type: 'field/resize', id: 'f1', width: 312 })
  assert.equal(resized.present.fields[0].width, 312)
  assert.equal(resized.present.rows, doc.rows)
  assert.deepEqual(historyReducer(resized, { type: 'undo' }).present, doc)
})

test('editing field metadata keeps row references, while option renames update only affected rows', () => {
  const doc = initialDocument()
  const renamed = applyCommand(doc, { type: 'field/save', field: { ...doc.fields[0], label: '标题' } })
  assert.equal(renamed.rows, doc.rows)
  const options = doc.fields[1].options.map((option) => (option.id === 'o2' ? { ...option, label: '处理中' } : option))
  const updated = applyCommand(renamed, {
    type: 'field/save',
    field: { ...renamed.fields[1], options },
  })
  assert.equal(updated.rows[0].f2, '处理中')
  assert.equal(updated.rows[1], renamed.rows[1])
  assert.equal(updated.rows[2], renamed.rows[2])
})

test('automatic time fields initialize on new rows and update only the edited row', () => {
  let doc = initialDocument()
  doc = applyCommand(doc, { type: 'field/save', field: { id: 'created', label: '新建时间', type: 'created_time' } })
  doc = applyCommand(doc, { type: 'field/save', field: { id: 'modified', label: '修改时间', type: 'modified_time' } })
  const original = doc.rows[0]
  for (const row of doc.rows) {
    assert.match(row.created, /^\d{4}-\d{2}-\d{2}T/)
    assert.match(row.modified, /^\d{4}-\d{2}-\d{2}T/)
  }

  const changed = applyCommand(doc, {
    type: 'rows/change',
    before: doc.rows,
    after: [{ ...original, f1: '已编辑', created: 'tampered', modified: 'tampered' }, ...doc.rows.slice(1)],
  })
  assert.equal(changed.rows[0].created, original.created)
  assert.ok(Date.parse(changed.rows[0].modified) > Date.parse(original.modified))
  assert.equal(changed.rows[1], doc.rows[1])

  const noOp = applyCommand(changed, {
    type: 'rows/change',
    before: changed.rows,
    after: [{ ...changed.rows[0], created: 'tampered' }, ...changed.rows.slice(1)],
  })
  assert.equal(noOp, changed)

  const added = applyCommand(changed, {
    type: 'rows/add',
    row: { ...createRow(changed.fields), created: 'tampered', modified: 'tampered' },
  })
  assert.match(added.rows.at(-1).created, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(added.rows.at(-1).created, added.rows.at(-1).modified)

  const duplicate = { ...original, id: 'duplicate' }
  const copied = applyCommand(doc, {
    type: 'rows/change',
    before: doc.rows,
    after: [doc.rows[0], duplicate, ...doc.rows.slice(1)],
  })
  assert.notEqual(copied.rows[1].created, 'tampered')
  assert.equal(copied.rows[1].created, copied.rows[1].modified)
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
