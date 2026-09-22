import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('interactive SVG pins do not contain hoisted title elements', () => {
  assert.doesNotMatch(readFileSync(new URL('../app/DiagramEditor.tsx', import.meta.url), 'utf8'), /<title(?:\s|>)/)
})
