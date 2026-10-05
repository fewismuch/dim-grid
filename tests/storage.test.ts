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
  doc.view.name = '项目进度'
  doc.view.filters = [
    { id: 'a', fieldId: 'f1', op: 'contains', value: '任务' },
    { id: 'c', fieldId: 'f3', op: 'greater_equal', value: '2024-03-01' },
  ]
  doc.view.sorts = [{ id: 'b', fieldId: 'f3', dir: 'desc' }]
  doc.view.groupBy = { fieldId: 'f2', collapsed: new Set(['进行中']) }
  doc.view.hiddenFields.add('f3')
  doc.view.highlightDupes.add('f1')
  doc.view.colStats.f2 = 'filled'
  doc.view.pinnedFieldId = 'f2'
  doc.view.rowHeight = 'high'
  doc.fields[0].width = 60
  assert.deepEqual(deserializeDocument(serializeDocument(doc)), doc)
})

test('legacy Chinese statistic names migrate to stable keys', () => {
  const legacy = JSON.parse(serializeDocument(initialDocument()))
  legacy.view.colStats = { f2: '已填写数' }
  assert.equal(deserializeDocument(JSON.stringify(legacy)).view.colStats.f2, 'filled')
})

test('older backups default to low row height and saved choices round trip', () => {
  const legacy = JSON.parse(serializeDocument(initialDocument()))
  delete legacy.view.rowHeight
  assert.equal(deserializeDocument(JSON.stringify(legacy)).view.rowHeight, 'low')
  legacy.view.rowHeight = 'medium'
  assert.equal(deserializeDocument(JSON.stringify(legacy)).view.rowHeight, 'medium')
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

test('cell text colors survive backup and invalid colors are rejected', () => {
  const doc = initialDocument()
  doc.rows[0].__cellColors = { f1: '#fa8c16' }
  const encoded = serializeDocument(doc)
  assert.deepEqual(deserializeDocument(encoded), doc)
  const invalid = JSON.parse(encoded)
  invalid.rows[0].__cellColors.f1 = 'url(javascript:alert(1))'
  assert.throws(() => deserializeDocument(JSON.stringify(invalid)))
})

test('automatic time fields retain exact instants in backups', () => {
  const doc = initialDocument()
  doc.fields.push({ id: 'created', label: '新建时间', type: 'created_time' })
  doc.rows[0].created = '2026-10-04T09:10:11.123Z'
  assert.equal(deserializeDocument(serializeDocument(doc)).rows[0].created, doc.rows[0].created)
  const invalid = JSON.parse(serializeDocument(doc))
  invalid.rows[0].created = 'yesterday'
  assert.throws(() => deserializeDocument(JSON.stringify(invalid)))
})

test('version 1 migration preserves local calendar dates and creates missing record/option IDs', () => {
  const doc = initialDocument()
  const source = JSON.parse(JSON.stringify(doc))
  source.version = 1
  delete source.view.name
  delete source.rows[0].id
  delete source.fields[1].options[0].id
  const migrated = deserializeDocument(JSON.stringify(source))
  assert.equal(cellText(migrated.rows[0].f3), cellText(doc.rows[0].f3))
  assert.equal(migrated.rows[0].id, 'migrated-row-0')
  assert.equal(migrated.view.name, '表格视图')
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
    (doc) => {
      doc.fields[0].width = -1
    },
    (doc) => {
      doc.fields[0].width = 59
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

test('custom storage keys keep embedded grids independent', () => {
  const storage = memory()
  const first = initialDocument()
  const second = initialDocument()
  first.view.name = '第一张表'
  second.view.name = '第二张表'
  assert.equal(saveDocument(storage, first, 'grid.first'), null)
  assert.equal(saveDocument(storage, second, 'grid.second'), null)
  assert.equal(loadDocument(storage, initialDocument(), 'grid.first').document.view.name, '第一张表')
  assert.equal(loadDocument(storage, initialDocument(), 'grid.second').document.view.name, '第二张表')
  assert.equal(storage.getItem(STORAGE_KEY), null)
})

test('caller-provided initial data is used only without a saved document', () => {
  const storage = memory()
  const supplied = initialDocument()
  supplied.fields = [{ id: 'name', label: '姓名', type: 'text' }]
  supplied.rows = [{ id: 'person-1', name: '张三' }]
  assert.deepEqual(loadDocument(storage, supplied).document, supplied)

  const saved = initialDocument()
  saved.rows[0].f1 = '已保存'
  assert.equal(saveDocument(storage, saved), null)
  assert.deepEqual(loadDocument(storage, supplied).document, saved)
})
