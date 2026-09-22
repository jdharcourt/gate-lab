import assert from 'node:assert/strict'
import test from 'node:test'
import { compileDiagram, evaluate, formatExpression, fromTruthTable, inputsIn, parseExpression, rowInputs } from '../app/logic.ts'

test('all binary gates evaluate their four input combinations', () => {
  const expected = {
    AND: '0001', OR: '0111', XOR: '0110', NAND: '1110', NOR: '1000', XNOR: '1001',
  }
  for (const [gate, values] of Object.entries(expected)) {
    const node = parseExpression(`A ${gate} B`)
    assert.equal(Array.from({ length: 4 }, (_, row) => Number(evaluate(node, rowInputs(['A', 'B'], row)))).join(''), values)
  }
  assert.equal(evaluate(parseExpression('A XAND B'), { A: true, B: true }), true)
})

test('NOT, parentheses, and precedence work', () => {
  const node = parseExpression('NOT A OR B AND C')
  assert.deepEqual(inputsIn(node), ['A', 'B', 'C'])
  assert.equal(evaluate(node, { A: true, B: true, C: false }), false)
  assert.equal(evaluate(parseExpression('(A OR B) AND C'), { A: true, B: false, C: false }), false)
  assert.equal(evaluate(parseExpression('A ^ B'), { A: true, B: false }), true)
})

test('invalid expressions and excess inputs are rejected', () => {
  for (const source of ['A AND', '(A OR B', 'A B', 'A $ B', 'A OR B OR C OR D OR E']) {
    assert.throws(() => parseExpression(source))
  }
})

test('every two and three-input truth table can be synthesized', () => {
  for (const names of [['A', 'B'], ['A', 'B', 'C']]) {
    const rows = 1 << names.length
    for (let pattern = 0; pattern < 1 << rows; pattern++) {
      const outputs = Array.from({ length: rows }, (_, index) => Boolean(pattern & (1 << index)))
      const node = fromTruthTable(names, outputs)
      assert.ok(node)
      outputs.forEach((value, index) => assert.equal(evaluate(node, rowInputs(names, index)), value, `${names.length} inputs, pattern ${pattern}, row ${index}`))
      assert.ok(parseExpression(formatExpression(node)))
    }
  }
})

test('incomplete table does not produce a circuit', () => {
  assert.equal(fromTruthTable(['A'], [false, null]), null)
})

test('four-input tables synthesize correct circuits', () => {
  const names = ['A', 'B', 'C', 'D']
  for (let pattern = 0; pattern < 200; pattern++) {
    const outputs = Array.from({ length: 16 }, (_, index) => Boolean(((pattern * 1103515245 + 12345) >>> (index % 16)) & 1))
    const node = fromTruthTable(names, outputs)
    outputs.forEach((value, index) => assert.equal(evaluate(node, rowInputs(names, index)), value))
  }
})

test('a hand-wired diagram evaluates and rejects incomplete or cyclic circuits', () => {
  const gates = [
    { id: 1, gate: 'AND', x: 300, y: 200, sources: ['input:A', 'input:B'] },
    { id: 2, gate: 'NOT', x: 500, y: 200, sources: ['gate:1'] },
  ]
  const node = compileDiagram(['A', 'B'], gates, 'gate:2')
  assert.equal(evaluate(node, { A: true, B: true }), false)
  assert.equal(evaluate(node, { A: true, B: false }), true)
  assert.throws(() => compileDiagram(['A', 'B'], gates, null))
  assert.throws(() => compileDiagram(['A', 'B'], [{ ...gates[0], sources: ['gate:2', 'input:B'] }, gates[1]], 'gate:2'))
  assert.throws(() => compileDiagram(['A', 'B'], gates, 'input:A'))
})
