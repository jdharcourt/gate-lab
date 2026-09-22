import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('interactive SVG pins do not contain hoisted title elements', () => {
  assert.doesNotMatch(readFileSync(new URL('../app/DiagramEditor.tsx', import.meta.url), 'utf8'), /<title(?:\s|>)/)
})

test('nonce-based CSP renders the page per request', () => {
  const policy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8')
  if (!policy.includes("'strict-dynamic'")) return
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
  assert.match(layout, /import\s*\{\s*connection\s*\}\s*from\s*['"]next\/server['"]/)
  assert.match(layout, /await connection\(\)/)
})
