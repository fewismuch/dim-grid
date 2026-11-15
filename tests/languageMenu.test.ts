import assert from 'node:assert/strict'
import { test } from 'node:test'
import { languageMenuItems } from '../src/components/BackupControls/languageMenu.ts'
import type { GridLocale } from '../src/i18n.ts'

test('language controls are opt-in for existing controlled consumers', () => {
  assert.deepEqual(languageMenuItems('Language'), [])
})

test('more menu requests supported locales without owning the controlled value', () => {
  const changes: GridLocale[] = []
  const items = languageMenuItems('Interface language', (locale) => changes.push(locale))
  const group = items.find((item) => item.type === 'group')
  assert.equal(group?.label, 'Interface language')
  assert.deepEqual(
    group?.children?.map((item) => item.key),
    ['locale:zh-CN', 'locale:en-US'],
  )
  assert.deepEqual(changes, [])
  group?.children?.[1].onClick()
  group?.children?.[0].onClick()
  assert.deepEqual(changes, ['en-US', 'zh-CN'])
})
