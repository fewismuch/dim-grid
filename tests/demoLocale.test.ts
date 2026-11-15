import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEMO_LOCALE_KEY, readDemoLocale, saveDemoLocale } from '../src/demoLocale.ts'

test('demo language defaults to Chinese and restores only supported preferences', () => {
  for (const value of [null, '', 'fr-FR', 'zh-CN']) {
    assert.equal(readDemoLocale({ getItem: () => value }), 'zh-CN')
  }
  assert.equal(readDemoLocale({ getItem: () => 'en-US' }), 'en-US')
})

test('demo language persists separately without modifying table data', () => {
  const data = new Map([['dim-grid.demo', '{"untouched":true}']])
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  saveDemoLocale(storage, 'en-US')
  assert.equal(data.get(DEMO_LOCALE_KEY), 'en-US')
  assert.equal(readDemoLocale(storage), 'en-US')
  saveDemoLocale(storage, 'zh-CN')
  assert.equal(readDemoLocale(storage), 'zh-CN')
  assert.equal(data.get('dim-grid.demo'), '{"untouched":true}')
})

test('blocked browser storage does not break demo language switching', () => {
  const blocked = () => {
    throw new Error('Storage blocked')
  }
  assert.equal(readDemoLocale({ getItem: blocked }), 'zh-CN')
  assert.doesNotThrow(() => saveDemoLocale({ setItem: blocked }, 'en-US'))
})
