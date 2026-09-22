import { evaluate, type Node } from './logic'
import { GateShape, gateOutputX } from './GateShape'

type Positioned = { node: Node; x: number; y: number; id: number; children: Positioned[] }

export function Circuit({ node, values, animate = false }: { node: Node; values: Record<string, boolean>; animate?: boolean }) {
  function depth(current: Node): number {
    if (current.kind === 'not') return 1 + depth(current.child)
    if (current.kind === 'gate') return 1 + Math.max(depth(current.left), depth(current.right))
    return 0
  }

  let leaf = 0
  let id = 0
  const width = Math.max(550, 270 + depth(node) * 170)
  function position(current: Node, level: number): Positioned {
    const children = current.kind === 'not' ? [position(current.child, level + 1)]
      : current.kind === 'gate' ? [position(current.left, level + 1), position(current.right, level + 1)] : []
    const y = children.length ? children.reduce((sum, child) => sum + child.y, 0) / children.length : 62 + leaf++ * 76
    return { node: current, x: children.length ? width - 160 - level * 170 : 32, y, id: id++, children }
  }
  const root = position(node, 0)
  const height = Math.max(250, 124 + (leaf - 1) * 76)
  const strokes: React.ReactNode[] = []
  const symbols: React.ReactNode[] = []

  function draw(current: Positioned) {
    current.children.forEach((child, index) => {
      draw(child)
      const start = child.children.length ? gateOutputX(child.node.kind === 'not' ? 'NOT' : child.node.kind === 'gate' ? child.node.gate : 'AND', child.x) : child.x + 42
      const end = current.x
      const target = current.y + (current.children.length === 1 ? 0 : index === 0 ? -13 : 13)
      strokes.push(<path key={`${child.id}-${current.id}`} d={`M ${start} ${child.y} H ${Math.max(start + 10, end - 23)} V ${target} H ${end}`} pathLength={1} style={animate ? { animationDelay: `${depth(child.node) * 450 + 150}ms` } : undefined} className={evaluate(child.node, values) ? 'wire on' : 'wire'} />)
    })
    const active = evaluate(current.node, values)
    if (!current.children.length) {
      symbols.push(<g key={current.id} className="signal-symbol" style={animate ? { animationDelay: `${depth(current.node) * 450}ms` } : undefined}>
        <rect x={current.x} y={current.y - 18} width="42" height="36" rx="5" className={active ? 'terminal on' : 'terminal'} />
        <text x={current.x + 21} y={current.y + 5} className="terminal-text">{current.node.kind === 'input' ? current.node.name : current.node.kind === 'constant' && current.node.value ? '1' : '0'}</text>
      </g>)
      return
    }
    const name = current.node.kind === 'not' ? 'NOT' : current.node.kind === 'gate' ? current.node.gate : ''
    symbols.push(<g key={current.id} className="signal-symbol" style={animate ? { animationDelay: `${depth(current.node) * 450}ms` } : undefined}>
      <GateShape gate={name as 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'} x={current.x} y={current.y} className={active ? 'gate on' : 'gate'} />
    </g>)
  }
  draw(root)
  const outputStart = root.children.length ? gateOutputX(root.node.kind === 'not' ? 'NOT' : root.node.kind === 'gate' ? root.node.gate : 'AND', root.x) : root.x + 42

  return <div className={animate ? 'circuit-scroll circuit-playing' : 'circuit-scroll'}>
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Logic gate circuit for the current expression">
      <path d={`M ${outputStart} ${root.y} H ${width - 42}`} pathLength={1} style={animate ? { animationDelay: `${depth(node) * 450 + 150}ms` } : undefined} className={evaluate(node, values) ? 'wire on' : 'wire'} />
      {strokes}{symbols}
      <circle cx={width - 40} cy={root.y} r="5" style={animate ? { animationDelay: `${(depth(node) + 1) * 450}ms` } : undefined} className={evaluate(node, values) ? 'output-dot on signal-output' : 'output-dot signal-output'} />
      <text x={width - 30} y={root.y + 5} className="output-text">Q</text>
    </svg>
  </div>
}
