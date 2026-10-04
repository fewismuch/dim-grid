import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
})
after(() => server.close())
const { default: buildDsgCol } = await server.ssrLoadModule('/src/buildDsgCol.tsx')
const options = [
  { label: '甲', color: '#fff', textColor: '#000' },
  { label: '乙', color: '#fff', textColor: '#000' },
]

for (const type of ['select', 'multi_select', 'link', 'date']) {
  test(`${type} clipboard callbacks return complete rows and preserve identity`, () => {
    const column = buildDsgCol({ id: 'f', label: '列', type, options })
    const rowData = { id: 'record', other: '必须保留', f: '' }
    const value = type === 'date' ? '2024-03-15' : type === 'link' ? 'https://example.com' : '甲'
    const pasted = column.pasteValue({ rowData, value, rowIndex: 0 })
    assert.equal(pasted.id, rowData.id)
    assert.equal(pasted.other, rowData.other)
    assert.notEqual(pasted, rowData)
    assert.equal(column.copyValue({ rowData: pasted, rowIndex: 0 }), type === 'link' ? new URL(value).href : value)
    const cleared = column.deleteValue({ rowData: pasted, rowIndex: 0 })
    assert.equal(cleared.id, rowData.id)
    assert.equal(cleared.other, rowData.other)
    assert.equal(column.isCellEmpty({ rowData: cleared, rowIndex: 0 }), true)
    assert.equal(rowData.f, '')
  })
}

test('multi-select paste removes invalid labels and repeated selections', () => {
  const col = buildDsgCol({ id: 'f', label: '标签', type: 'multi_select', options })
  const result = col.pasteValue({ rowData: { id: 'a' }, value: '甲, 不存在, 乙, 甲', rowIndex: 0 })
  assert.deepEqual(JSON.parse(result.f), ['甲', '乙'])
})

test('date paste rejects invalid calendar dates', () => {
  const col = buildDsgCol({ id: 'f', label: '日期', type: 'date' })
  assert.equal(col.pasteValue({ rowData: { id: 'a' }, value: '2024-02-31', rowIndex: 0 }).f, null)
})

test('progress paste respects bounds and preserves other fields', () => {
  const col = buildDsgCol({ id: 'f', label: '进度', type: 'progress' })
  const rowData = { id: 'a', other: '保留' }
  assert.deepEqual(col.pasteValue({ rowData, value: '150', rowIndex: 0 }), { ...rowData, f: '100' })
  assert.equal(col.pasteValue({ rowData, value: '-5', rowIndex: 0 }).f, '0')
  assert.equal(col.pasteValue({ rowData, value: 'invalid', rowIndex: 0 }).f, '')
})

test('email paste validates shape, trims whitespace and never destroys an existing value', () => {
  const col = buildDsgCol({ id: 'email', label: '邮箱', type: 'email' })
  const rowData = { id: 'a', email: 'original@example.com', other: '保留' }
  assert.deepEqual(col.pasteValue({ rowData, value: ' test@example.com ', rowIndex: 0 }), {
    ...rowData,
    email: 'test@example.com',
  })
  assert.equal(col.pasteValue({ rowData, value: 'invalid', rowIndex: 0 }), rowData)
  assert.equal(col.pasteValue({ rowData, value: '', rowIndex: 0 }).email, '')
})
