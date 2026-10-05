import assert from 'node:assert/strict'
import { test } from 'node:test'
import { columnWidth } from '../src/model/columnWidth.ts'

test('automatic width includes the header and representative cell content', () => {
  const field = { id: 'name', label: '名称', type: 'text' as const }
  const emptyWidth = columnWidth(field, [])
  const contentWidth = columnWidth(field, [{ id: 'row', name: 'A longer project name that needs more room' }])
  assert.ok(contentWidth > emptyWidth)
  assert.ok(contentWidth <= 360)
  assert.ok(columnWidth({ ...field, label: '一个很长很长的列标题' }, []) > emptyWidth)
})

test('explicit width wins over automatic width and long content is capped', () => {
  const rows = [{ id: 'row', name: 'x'.repeat(300) }]
  const field = { id: 'name', label: '名称', type: 'text' as const }
  assert.equal(columnWidth(field, rows), 360)
  assert.equal(columnWidth({ ...field, width: 90 }, rows), 90)
})

test('multi-select width accounts for separate tags', () => {
  const field = { id: 'tags', label: '标签', type: 'multi_select' as const }
  const one = columnWidth(field, [{ id: 'row', tags: '["设计"]' }])
  const several = columnWidth(field, [{ id: 'row', tags: '["设计","开发","测试","文档"]' }])
  assert.ok(several > one)
})
