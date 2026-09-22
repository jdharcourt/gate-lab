export type Gate = 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'
export type Node =
  | { kind: 'input'; name: string }
  | { kind: 'constant'; value: boolean }
  | { kind: 'not'; child: Node }
  | { kind: 'gate'; gate: Gate; left: Node; right: Node }
export type DiagramGate = { id: number; gate: Gate | 'NOT'; x: number; y: number; sources: (string | null)[] }

const precedence: Record<Gate, number> = {
  OR: 1, NOR: 1, XOR: 2, XNOR: 2, AND: 3, NAND: 3,
}

export function parseExpression(source: string): Node {
  if (source.length > 256) throw new Error('Keep expressions under 256 characters.')
  const tokens = source.toUpperCase().match(/[A-Z]+|[01]|[()!&|^]|\S/g) ?? []
  if (!tokens.length) throw new Error('Enter an expression to see its table and circuit.')
  const names = new Set<string>()
  let index = 0

  function primary(): Node {
    const token = tokens[index++]
    if (token === 'NOT' || token === '!') return { kind: 'not', child: primary() }
    if (token === '(') {
      const node = expression(0)
      if (tokens[index++] !== ')') throw new Error('A closing parenthesis is missing.')
      return node
    }
    if (token === '0' || token === '1') return { kind: 'constant', value: token === '1' }
    if (token && /^[A-Z]$/.test(token)) {
      names.add(token)
      if (names.size > 4) throw new Error('Use up to four different inputs.')
      return { kind: 'input', name: token }
    }
    throw new Error(`Expected an input, NOT, or ( near “${token ?? 'end'}”.`)
  }

  function expression(minimum: number): Node {
    let left = primary()
    while (index < tokens.length) {
      const symbol = tokens[index]
      const gate = ({ '&': 'AND', '|': 'OR', '^': 'XOR', XAND: 'XNOR' } as Record<string, Gate>)[symbol] ?? symbol as Gate
      if (!(gate in precedence) || precedence[gate] < minimum) break
      index++
      left = { kind: 'gate', gate, left, right: expression(precedence[gate] + 1) }
    }
    return left
  }

  const result = expression(0)
  if (index !== tokens.length) throw new Error(`Unexpected “${tokens[index]}”. Check the operators and parentheses.`)
  return result
}

export function inputsIn(node: Node): string[] {
  const names = new Set<string>()
  function visit(current: Node) {
    if (current.kind === 'input') names.add(current.name)
    if (current.kind === 'not') visit(current.child)
    if (current.kind === 'gate') {
      visit(current.left)
      visit(current.right)
    }
  }
  visit(node)
  return [...names].sort()
}

export function evaluate(node: Node, inputs: Record<string, boolean>): boolean {
  if (node.kind === 'input') return inputs[node.name] ?? false
  if (node.kind === 'constant') return node.value
  if (node.kind === 'not') return !evaluate(node.child, inputs)
  return evaluateGate(node.gate, evaluate(node.left, inputs), evaluate(node.right, inputs))
}

export function evaluateGate(gate: Gate, left: boolean, right: boolean): boolean {
  switch (gate) {
    case 'AND': return left && right
    case 'OR': return left || right
    case 'XOR': return left !== right
    case 'NAND': return !(left && right)
    case 'NOR': return !(left || right)
    case 'XNOR': return left === right
  }
}

export function rowInputs(names: string[], row: number): Record<string, boolean> {
  return Object.fromEntries(names.map((name, index) => [name, Boolean(row & (1 << (names.length - index - 1)))]))
}

export function fromTruthTable(names: string[], outputs: (boolean | null)[]): Node | null {
  if (outputs.some(value => value === null)) return null
  const ones = outputs.flatMap((value, index) => value ? [index] : [])
  if (!ones.length) return { kind: 'constant', value: false }
  if (ones.length === outputs.length) return { kind: 'constant', value: true }

  let current = ones.map(value => ({ bits: value, mask: 0, covers: [value] }))
  const primes: typeof current = []
  while (current.length) {
    const combined = new Set<number>()
    const next: typeof current = []
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        if (current[i].mask !== current[j].mask) continue
        const difference = current[i].bits ^ current[j].bits
        if (!difference || (difference & (difference - 1)) || (difference & current[i].mask)) continue
        combined.add(i)
        combined.add(j)
        const bits = current[i].bits & ~difference
        const mask = current[i].mask | difference
        if (!next.some(item => item.bits === bits && item.mask === mask)) {
          next.push({ bits, mask, covers: [...new Set([...current[i].covers, ...current[j].covers])] })
        }
      }
    }
    current.forEach((item, index) => {
      if (!combined.has(index) && !primes.some(prime => prime.bits === item.bits && prime.mask === item.mask)) primes.push(item)
    })
    current = next
  }

  const uncovered = new Set(ones)
  const chosen: typeof primes = []
  while (uncovered.size) {
    let best = primes[0]
    let score = -1
    for (const prime of primes) {
      const coverage = prime.covers.filter(value => uncovered.has(value)).length
      const rank = coverage * 10 + prime.mask.toString(2).replace(/0/g, '').length
      if (coverage && rank > score) {
        best = prime
        score = rank
      }
    }
    chosen.push(best)
    best.covers.forEach(value => uncovered.delete(value))
  }

  return chosen.map(prime => {
    const terms = names.flatMap((name, index): Node[] => {
      const bit = 1 << (names.length - index - 1)
      if (prime.mask & bit) return []
      const input: Node = { kind: 'input', name }
      return [prime.bits & bit ? input : { kind: 'not', child: input }]
    })
    return terms.reduce((left, right): Node => ({ kind: 'gate', gate: 'AND', left, right }))
  }).reduce((left, right): Node => ({ kind: 'gate', gate: 'OR', left, right }))
}

export function formatExpression(node: Node): string {
  if (node.kind === 'input') return node.name
  if (node.kind === 'constant') return node.value ? '1' : '0'
  if (node.kind === 'not') return `NOT ${node.child.kind === 'gate' ? `(${formatExpression(node.child)})` : formatExpression(node.child)}`
  const left = node.left.kind === 'gate' && precedence[node.left.gate] < precedence[node.gate]
    ? `(${formatExpression(node.left)})` : formatExpression(node.left)
  const right = node.right.kind === 'gate' && precedence[node.right.gate] <= precedence[node.gate]
    ? `(${formatExpression(node.right)})` : formatExpression(node.right)
  return `${left} ${node.gate} ${right}`
}

export function compileDiagram(names: string[], gates: DiagramGate[], output: string | null): Node {
  if (!output) throw new Error('Connect a gate or input to Q to complete the circuit.')
  const visited = new Set<number>()

  function resolve(source: string, path: number[]): Node {
    if (source.startsWith('input:')) {
      const name = source.slice(6).split(':')[0]
      if (!names.includes(name)) throw new Error(`Input ${name} is not on the canvas.`)
      return { kind: 'input', name }
    }
    const id = Number(source.slice(5))
    const gate = gates.find(item => item.id === id)
    if (!gate || !source.startsWith('gate:')) throw new Error('A connection points to a missing gate.')
    if (path.includes(id)) throw new Error('The circuit has a loop. Disconnect one of its wires.')
    visited.add(id)
    const next = [...path, id]
    if (!gate.sources[0]) throw new Error(`Connect the input pins on ${gate.gate}.`)
    const left = resolve(gate.sources[0], next)
    if (gate.gate === 'NOT') return { kind: 'not', child: left }
    if (!gate.sources[1]) throw new Error(`Connect both input pins on ${gate.gate}.`)
    return { kind: 'gate', gate: gate.gate, left, right: resolve(gate.sources[1], next) }
  }

  const node = resolve(output, [])
  if (visited.size !== gates.length) throw new Error('Connect every gate to Q or remove unused gates.')
  return node
}
