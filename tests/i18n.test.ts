import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translate } from '../src/i18n.ts'
import { initialDocument } from '../src/model/document.ts'
import { calcStat, processRows } from '../src/model/table.ts'

test('English locale gives new documents English defaults without translating supplied data', () => {
  const english = initialDocument('en-US')
  assert.equal(english.view.name, 'Grid view')
  assert.equal(english.fields[0].label, 'Text')
  assert.equal(english.fields[1].options?.[1].label, 'In progress')
  assert.equal(english.rows[0].f1, 'Task A')
  assert.equal(translate('en-US', '自定义字段'), '自定义字段')
  assert.equal(translate('zh-CN', '文本'), '文本')
})

test('statistic keys calculate independently of translated labels', () => {
  const document = initialDocument('en-US')
  assert.equal(calcStat('filled', document.rows, document.fields[0]), 1)
  assert.equal(calcStat('已填写数', document.rows, document.fields[0]), 1)
  assert.equal(processRows(document.rows, document.fields, [], [], 'Task', 'en-US').length, 1)
})
