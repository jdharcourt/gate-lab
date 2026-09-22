import type { Gate } from './logic'

export function gateOutputX(gate: Gate | 'NOT', x: number) {
  return x + (['NOT', 'NAND', 'NOR', 'XNOR'].includes(gate) ? 108 : 98)
}

export function GateShape({ gate, x, y, className }: { gate: Gate | 'NOT'; x: number; y: number; className: string }) {
  const base = gate === 'XNOR' ? 'XOR' : gate === 'NOT' ? 'NOT' : gate.replace(/^N/, '')
  const inverted = ['NOT', 'NAND', 'NOR', 'XNOR'].includes(gate)
  return <g transform={`translate(${x} ${y})`}>
    {base === 'AND' ? <path d="M 0 -25 H 47 C 71 -25 90 -15 90 0 C 90 15 71 25 47 25 H 0 Z" className={className} />
      : base === 'OR' || base === 'XOR' ? <>
        <path d="M 0 -25 C 39 -25 71 -21 90 0 C 71 21 39 25 0 25 C 14 10 14 -10 0 -25 Z" className={className} />
        {base === 'XOR' && <path d="M -8 -25 C 6 -10 6 10 -8 25" className={`${className} gate-back`} />}
      </> : <path d="M 0 -25 L 88 0 L 0 25 Z" className={className} />}
    {inverted && <circle cx="96" cy="0" r="5" className={className} />}
    <text x="45" y="4" className="gate-text">{gate}</text>
  </g>
}
