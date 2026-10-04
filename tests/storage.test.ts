import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialDocument } from '../src/model/document.ts'
import {
  deserializeDocument,
  loadDocument,
  STORAGE_KEY,
  saveDocument,
  serializeDocument,
} from '../src/model/storage.ts'
import { cellText } from '../src/model/table.ts'

const memory = (raw = null) => {
  const items = new Map(raw === null ? [] : [[STORAGE_KEY, raw]])
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), items }
}

test('versioned storage round trip preserves dates, IDs, field order and complete view state', () => {
  const doc = initialDocument()
  doc.view.filters = [{ id: 'a', fieldId: 'f1', op: 'contains', value: '任务' }]
  doc.view.sorts = [{ id: 'b', fieldId: 'f3', dir: 'desc' }]
  doc.view.groupBy = { fieldId: 'f2', collapsed: new Set(['进行中']) }
  doc.view.hiddenFields.add('f3')
  doc.view.highlightDupes.add('f1')
  doc.view.colStats.f2 = '已填写数'
  assert.deepEqual(deserializeDocument(serializeDocument(doc)), doc)
})

test('structured values use arrays and objects on disk and legacy adapters in memory', () => {
  const doc = initialDocument()
  doc.fields.push({ id: 'multi', label: '多选', type: 'multi_select' }, { id: 'link', label: '链接', type: 'link' })
  doc.rows.forEach((row) => {
    row.multi = '["甲","乙"]'
    row.link = '{"text":"网站","link":"https://example.com"}'
  })
  const encoded = serializeDocument(doc)
  assert.deepEqual(JSON.parse(encoded).rows[0].multi, ['甲', '乙'])
  assert.equal(JSON.parse(encoded).rows[0].link.text, '网站')
  assert.deepEqual(deserializeDocument(encoded), doc)
})

test('version 1 migration preserves local calendar dates and creates missing record/option IDs', () => {
  const doc = initialDocument()
  const source = JSON.parse(JSON.stringify(doc))
  source.version = 1
  delete source.rows[0].id
  delete source.fields[1].options[0].id
  const migrated = deserializeDocument(JSON.stringify(source))
  assert.equal(cellText(migrated.rows[0].f3), cellText(doc.rows[0].f3))
  assert.equal(migrated.rows[0].id, 'migrated-row-0')
  assert.ok(migrated.fields[1].options[0].id)
})

test('corrupt or future-version data is preserved and automatic overwrite is disabled', () => {
  for (const raw of ['{invalid', '{"version":99,"fields":[],"rows":[]}']) {
    const storage = memory(raw)
    const result = loadDocument(storage, initialDocument())
    assert.equal(result.writable, false)
    assert.equal(result.recoveryRaw, raw)
    assert.ok(result.error)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('invalid identity, calendar, unsafe keys and invalid cell shapes are rejected', () => {
  for (const modify of [
    (doc) => {
      doc.rows[1].id = doc.rows[0].id
    },
    (doc) => {
      doc.fields[1].id = doc.fields[0].id
    },
    (doc) => {
      doc.fields[0].id = '__proto__'
    },
    (doc) => {
      doc.fields[0].id = 'id'
    },
    (doc) => {
      doc.rows[0].f3 = '2024-02-31'
    },
    (doc) => {
      doc.fields[0].type = 'unknown'
    },
    (doc) => {
      doc.rows[0].f1 = { dangerous: 'shape' }
    },
  ]) {
    const source = JSON.parse(serializeDocument(initialDocument()))
    modify(source)
    assert.throws(() => deserializeDocument(JSON.stringify(source)))
  }
})

test('quota and unavailable storage failures are explicit, with no false save success', () => {
  const storage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('quota')
    },
  }
  assert.equal(loadDocument(storage, initialDocument()).writable, false)
  assert.ok(saveDocument(storage, initialDocument()))
  const healthy = memory()
  assert.equal(saveDocument(healthy, initialDocument()), null)
  assert.equal(loadDocument(healthy, initialDocument()).document.rows[0].f1, '任务 A')
})
