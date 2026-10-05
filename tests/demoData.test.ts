import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoData } from '../src/demoData.ts'
import { deserializeDocument, serializeDocument } from '../src/model/storage.ts'

test('demo data covers every field type and can be exported and imported', () => {
  assert.deepEqual(
    new Set(demoData.fields.map((field) => field.type)),
    new Set([
      'text',
      'number',
      'float',
      'select',
      'multi_select',
      'link',
      'date',
      'checkbox',
      'email',
      'rating',
      'progress',
      'created_time',
      'modified_time',
    ]),
  )
  assert.deepEqual(deserializeDocument(serializeDocument(demoData)), demoData)
})
