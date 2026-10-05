import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FieldDef, RowData } from '../src/model/table.ts'
import {
  calcStat,
  cellText,
  convertValue,
  createRow,
  duplicateRow,
  duplicateValues,
  isEmptyValue,
  parseLinkValue,
  parseMultiValue,
  processRows,
  reconcileRows,
  safeLink,
  textColorTarget,
} from '../src/model/table.ts'

const text: FieldDef = { id: 'name', label: '名称', type: 'text' }
const number: FieldDef = { id: 'n', label: '数量', type: 'number' }
const multi: FieldDef = { id: 'tags', label: '标签', type: 'multi_select' }
const link: FieldDef = { id: 'url', label: '链接', type: 'link' }
const rows: RowData[] = [
  { id: 'a', name: '甲', n: 10 },
  { id: 'b', name: '乙', n: 0 },
  { id: 'c', name: '', n: 2 },
]

test('text color target ignores missing and non-text cells after row changes', () => {
  const fields = [text, number, multi, link]
  assert.deepEqual(textColorTarget(rows.slice(1), fields, { row: 0, col: 0 }), { row: rows[1], field: text })
  assert.equal(textColorTarget(rows.slice(1), fields, null), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: -1, col: 0 }), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: 2, col: 0 }), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: 0, col: -1 }), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: 0, col: 4 }), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: 0, col: 2 }), null)
  assert.equal(textColorTarget(rows.slice(1), fields, { row: 0, col: 3 }), null)
})

test('empty filters work without a comparison value; zero is filled', () => {
  assert.deepEqual(
    processRows(rows, [text, number], [{ id: 'f', fieldId: 'name', op: 'empty', value: '' }], [], '').map((r) => r.id),
    ['c'],
  )
  assert.deepEqual(
    processRows(rows, [number], [{ id: 'f', fieldId: 'n', op: 'equals', value: '0' }], [], '').map((r) => r.id),
    ['b'],
  )
  assert.equal(isEmptyValue(0, number), false)
})

test('comparison filters use numeric values and exclude invalid or empty cells', () => {
  const source = [...rows, { id: 'd', n: null }, { id: 'e', n: 'invalid' }]
  for (const [op, expected] of [
    ['greater', ['a']],
    ['greater_equal', ['a', 'c']],
    ['less', ['b']],
    ['less_equal', ['b', 'c']],
  ] as const) {
    assert.deepEqual(
      processRows(source, [number], [{ id: 'f', fieldId: 'n', op, value: '2' }], [], '').map((r) => r.id),
      expected,
    )
  }
  assert.deepEqual(processRows(source, [number], [{ id: 'f', fieldId: 'n', op: 'greater', value: 'abc' }], [], ''), [])
})

test('comparison filters use dates rather than displayed strings', () => {
  const date: FieldDef = { id: 'd', label: '日期', type: 'date' }
  const created: FieldDef = { id: 't', label: '创建时间', type: 'created_time' }
  const source = [
    { id: 'a', d: new Date('2024-03-15T00:00:00'), t: '2024-03-15T12:00:00Z' },
    { id: 'b', d: new Date('2024-04-01T00:00:00'), t: '2024-04-01T12:00:00Z' },
  ]
  assert.deepEqual(
    processRows(source, [date], [{ id: 'f', fieldId: 'd', op: 'less', value: '2024-04-01' }], [], '').map((r) => r.id),
    ['a'],
  )
  assert.deepEqual(
    processRows(source, [created], [{ id: 'f', fieldId: 't', op: 'greater', value: '2024-03-20' }], [], '').map(
      (r) => r.id,
    ),
    ['b'],
  )
})

test('numeric sort uses values rather than lexicographic strings and leaves source intact', () => {
  assert.deepEqual(
    processRows(rows, [number], [], [{ id: 's', fieldId: 'n', dir: 'asc' }], '').map((r) => r.n),
    [0, 2, 10],
  )
  assert.deepEqual(
    rows.map((r) => r.n),
    [10, 0, 2],
  )
})

test('multi-column sorting has stable ties and empty values remain last', () => {
  const source = [
    { id: 'a', n: 2, name: 'B' },
    { id: 'b', n: 2, name: 'A' },
    { id: 'c', n: null, name: 'C' },
  ]
  assert.deepEqual(
    processRows(
      source,
      [text, number],
      [],
      [
        { id: '1', fieldId: 'n', dir: 'desc' },
        { id: '2', fieldId: 'name', dir: 'asc' },
      ],
      '',
    ).map((r) => r.id),
    ['b', 'a', 'c'],
  )
})

test('date sorting and searching use calendar values', () => {
  const field: FieldDef = { id: 'd', label: '日期', type: 'date' }
  const source = [
    { id: 'a', d: new Date('2024-04-01T00:00:00') },
    { id: 'b', d: new Date('2024-03-15T00:00:00') },
  ]
  assert.deepEqual(
    processRows(source, [field], [], [{ id: 's', fieldId: 'd', dir: 'asc' }], '').map((r) => r.id),
    ['b', 'a'],
  )
  assert.equal(processRows(source, [field], [], [], '2024-03-15')[0].id, 'b')
})

test('deleting a row in a sorted view does not overwrite adjacent or hidden rows', () => {
  const before = [rows[2], rows[0]]
  assert.deepEqual(reconcileRows(rows, before, [rows[0]]), [rows[0], rows[1]])
})

test('editing a grouped view preserves records in all other groups', () => {
  const edited = { ...rows[2], name: '已修改' }
  assert.deepEqual(reconcileRows(rows, [rows[2]], [edited]), [rows[0], rows[1], edited])
})

test('inserting and duplicating in filtered views retains identity and insertion order', () => {
  const inserted = { id: 'new', name: '新记录' }
  const clone = duplicateRow(rows[0])
  const updated = reconcileRows(rows, [rows[0], rows[2]], [rows[0], clone, inserted, rows[2]])
  assert.deepEqual(
    updated.map((r) => r.id),
    ['a', clone.id, 'new', 'b', 'c'],
  )
  assert.notEqual(clone.id, rows[0].id)
  assert.equal(rows[0].name, '甲')
})

test('deleting all displayed rows leaves hidden rows intact', () => {
  assert.deepEqual(reconcileRows(rows, [rows[0], rows[2]], []), [rows[1]])
})

test('new rows contain type defaults and unique IDs', () => {
  const fields = [text, number, multi, link, { id: 'check', label: '选中', type: 'checkbox' } as FieldDef]
  const row = createRow(fields)
  assert.equal(row.name, '')
  assert.equal(row.n, null)
  assert.equal(row.tags, '[]')
  assert.equal(row.url, '{}')
  assert.equal(row.check, false)
  assert.notEqual(row.id, createRow(fields).id)
})

test('malformed structured cells do not throw', () => {
  for (const value of ['null', 'false', '"text"', '{broken', '{}', 12]) {
    assert.deepEqual(parseMultiValue(value), [])
    assert.deepEqual(parseLinkValue(value), { text: '', link: '' })
  }
  assert.deepEqual(parseMultiValue('["a",2,"b"]'), ['a', 'b'])
})

test('structured empty cells do not count as filled or duplicate', () => {
  const source = [
    { id: 'a', tags: '[]', url: '{}' },
    { id: 'b', tags: '["甲"]', url: '{"text":"首页"}' },
  ]
  assert.equal(calcStat('已填写数', source, multi), 1)
  assert.equal(calcStat('未填写数', source, link), 1)
  assert.equal(calcStat('唯一数占比', [], multi), '0%')
  assert.equal(duplicateValues(source, [multi], new Set(['tags'])).get('tags')?.size, 0)
})

test('duplicate highlighting includes numeric zero and excludes empty values', () => {
  const source = [
    { id: 'a', n: 0 },
    { id: 'b', n: 0 },
    { id: 'c', n: null },
    { id: 'd', n: null },
  ]
  assert.deepEqual([...(duplicateValues(source, [number], new Set(['n'])).get('n') ?? [])], ['0'])
})

test('removed field references are ignored by filters and sorts', () => {
  assert.deepEqual(
    processRows(
      rows,
      [text],
      [{ id: 'f', fieldId: 'gone', op: 'not_empty', value: '' }],
      [{ id: 's', fieldId: 'gone', dir: 'asc' }],
      '',
    ),
    rows,
  )
})

test('type conversion handles compatible numbers and clears invalid structured values', () => {
  assert.equal(convertValue('12.8', text, { ...text, type: 'number' }), 12)
  assert.equal(convertValue('abc', text, { ...text, type: 'number' }), null)
  assert.equal(convertValue('invalid', text, { ...text, type: 'date' }), null)
  assert.equal(convertValue('2024-02-31', text, { ...text, type: 'date' }), null)
  assert.equal(convertValue('false', text, { ...text, type: 'checkbox' }), false)
  assert.equal(convertValue('300', text, { ...text, type: 'progress' }), '100')
  assert.equal(cellText(convertValue('2024-03-15', text, { ...text, type: 'date' })), '2024-03-15')
})

test('unsafe protocols are not accepted as openable links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'not a url'])
    assert.equal(safeLink(url), null)
  assert.equal(safeLink('https://example.com'), 'https://example.com/')
  assert.equal(safeLink('mailto:test@example.com'), 'mailto:test@example.com')
})

test('renaming and reordering options preserves selections by option identity', () => {
  const before: FieldDef = {
    id: 'f',
    label: '状态',
    type: 'select',
    options: [
      { id: 'o1', label: '待开始', color: '#fff', textColor: '#000' },
      { id: 'o2', label: '进行中', color: '#fff', textColor: '#000' },
    ],
  }
  assert.ok(before.options)
  const after: FieldDef = { ...before, options: [{ ...before.options[1], label: '处理中' }, before.options[0]] }
  assert.equal(convertValue('进行中', before, after), '处理中')
  assert.equal(
    convertValue('["进行中","待开始"]', { ...before, type: 'multi_select' }, { ...after, type: 'multi_select' }),
    '["处理中","待开始"]',
  )
})
