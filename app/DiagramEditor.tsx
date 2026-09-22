'use client'

import { useMemo, useRef, useState } from 'react'
import { GateShape, gateOutputX } from './GateShape'
import { compileDiagram, evaluate, formatExpression, rowInputs, type DiagramGate, type Gate } from './logic'

export function DiagramEditor() {
  const [inputs, setInputs] = useState([{ id: 1, name: 'A', x: 36, y: 102 }, { id: 2, name: 'B', x: 36, y: 402 }])
  const names = useMemo(() => [...new Set(inputs.map(input => input.name))].sort(), [inputs])
  const [gates, setGates] = useState<DiagramGate[]>([])
  const [output, setOutput] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [generated, setGenerated] = useState('')
  const [answers, setAnswers] = useState<(boolean | null)[]>([])
  const [checked, setChecked] = useState(false)
  const nextId = useRef(1)
  const nextInputId = useRef(3)
  const drag = useRef<{ kind: 'gate' | 'input'; id: number; x: number; y: number; clientX: number; clientY: number } | null>(null)

  const signature = JSON.stringify([names, gates.map(gate => [gate.id, gate.gate, gate.sources]), output])
  const compiled = useMemo(() => {
    try {
      return { node: compileDiagram(names, gates, output), error: '' }
    } catch (error) {
      return { node: null, error: error instanceof Error ? error.message : 'The circuit is incomplete.' }
    }
  }, [names, gates, output])
  const showTable = generated === signature && compiled.node
  const correct = showTable ? Array.from({ length: 1 << names.length }, (_, index) => evaluate(compiled.node, rowInputs(names, index))) : []
  const score = correct.filter((value, index) => answers[index] === value).length

  function point(connection: string) {
    if (connection.startsWith('input:')) {
      const [, name, id] = connection.split(':')
      const input = inputs.find(item => id ? item.id === Number(id) : item.name === name)
      return input ? { x: input.x + 80, y: input.y + 18 } : null
    }
    const gate = gates.find(item => connection === `gate:${item.id}`)
    return gate ? { x: gateOutputX(gate.gate, gate.x), y: gate.y } : null
  }

  function addInput(name: string) {
    if (inputs.length === 12 || names.length === 4 && !names.includes(name)) return
    const id = nextInputId.current++
    setInputs([...inputs, { id, name, x: 36 + Math.floor(inputs.length / 8) * 110, y: 54 + (inputs.length % 8) * 58 }])
  }

  function removeInput(id: number) {
    const connection = inputs.find(input => input.id === id)
    if (!connection) return
    const reference = `input:${connection.name}:${id}`
    setInputs(inputs.filter(input => input.id !== id))
    setGates(gates.map(gate => ({ ...gate, sources: gate.sources.map(current => current === reference ? null : current) })))
    if (output === reference) setOutput(null)
    if (source === reference) setSource(null)
  }

  function move(event: React.PointerEvent<SVGGElement>) {
    const active = drag.current
    if (!active) return
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds) return
    const x = active.x + (event.clientX - active.clientX) * 880 / bounds.width
    const y = active.y + (event.clientY - active.clientY) * 520 / bounds.height
    if (active.kind === 'input') {
      setInputs(current => current.map(input => input.id === active.id ? { ...input, x: Math.max(16, Math.min(680, x)), y: Math.max(16, Math.min(468, y)) } : input))
      return
    }
    setGates(current => current.map(gate => gate.id === active.id ? { ...gate, x: Math.max(160, Math.min(680, x)), y: Math.max(40, Math.min(480, y)) } : gate))
  }

  function addGate(gate: Gate | 'NOT') {
    if (gates.length === 10) return
    const id = nextId.current++
    setGates([...gates, { id, gate, x: 300 + (gates.length % 2) * 220, y: 105 + Math.floor(gates.length / 2) * 87, sources: Array(gate === 'NOT' ? 1 : 2).fill(null) }])
    setSource(null)
  }

  function connectGate(id: number, index: number) {
    if (source === `gate:${id}`) return
    setGates(gates.map(gate => gate.id === id ? { ...gate, sources: gate.sources.map((current, position) => position === index ? source : current) } : gate))
    setSource(null)
  }

  function removeGate(id: number) {
    setGates(gates.filter(gate => gate.id !== id).map(gate => ({ ...gate, sources: gate.sources.map(current => current === `gate:${id}` ? null : current) })))
    if (output === `gate:${id}`) setOutput(null)
    if (source === `gate:${id}`) setSource(null)
  }

  function generateTable() {
    if (!compiled.node) return
    setGenerated(signature)
    setAnswers(Array(1 << names.length).fill(null))
    setChecked(false)
  }

  function cycleAnswer(index: number) {
    const next = [...answers]
    next[index] = next[index] === null ? false : next[index] === false ? true : null
    setAnswers(next)
    setChecked(false)
  }

  return <div className="diagram-workspace">
    <aside className="toolbox" aria-label="Circuit tools">
      <h1>Draw a circuit</h1>
      <p>Add inputs and gates, then connect an output dot to a gate input or Q. Drag any block to move it.</p>
      <h2>Inputs</h2>
      <div className="tool-inputs">{'ABCD'.split('').map(name => <button key={name} onClick={() => addInput(name)} disabled={inputs.length === 12 || names.length === 4 && !names.includes(name)} aria-label={`Add ${name} input block`}>{name}</button>)}</div>
      <ul className="gate-list input-block-list">{inputs.map(input => <li key={input.id}><span>{input.name} · block {input.id}</span><button onClick={() => removeInput(input.id)} aria-label={`Remove ${input.name} input block ${input.id}`}>Remove</button></li>)}</ul>
      <h2>Gates</h2>
      <div className="gate-tools">{(['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR'] as const).map(gate => <button key={gate} onClick={() => addGate(gate)} disabled={gates.length === 10}><span className="tool-glyph">{gate === 'NOT' ? '¬' : gate === 'XOR' || gate === 'XNOR' ? '⊕' : gate === 'OR' || gate === 'NOR' ? '≥' : '&'}</span>{gate}</button>)}<button onClick={() => addGate('XNOR')} disabled={gates.length === 10}><span className="tool-glyph">⊕</span>XAND</button></div>
      {gates.length > 0 && <><h2>On canvas</h2><ul className="gate-list">{gates.map(gate => <li key={gate.id}><span>{gate.gate} {gate.id}</span><button onClick={() => removeGate(gate.id)} aria-label={`Remove ${gate.gate} ${gate.id}`}>Remove</button></li>)}</ul></>}
    </aside>

    <section className="canvas-pane" aria-labelledby="canvas-title">
      <div className="pane-toolbar"><h2 id="canvas-title">Circuit canvas</h2><span>{source ? `Connecting ${source.startsWith('input:') ? source.split(':')[1] : source.replace('gate:', 'gate ')} — choose a target pin` : 'Click a dot to start a wire'}</span></div>
      <div className="canvas-scroll"><svg className="edit-canvas" viewBox="0 0 880 520" width="880" height="520" aria-label="Editable logic gate circuit">
        <path d="M 145 0 V 520 M 792 0 V 520" className="canvas-guide" />
        {gates.flatMap(gate => gate.sources.map((connection, index) => {
          const start = connection ? point(connection) : null
          if (!start) return null
          const endY = gate.y + (gate.gate === 'NOT' ? 0 : index === 0 ? -14 : 14)
          return <path key={`${gate.id}-${index}`} d={`M ${start.x} ${start.y} C ${start.x + 75} ${start.y}, ${gate.x - 65} ${endY}, ${gate.x - 8} ${endY}`} className="edit-wire" />
        }))}
        {output && point(output) && <path d={`M ${point(output)!.x} ${point(output)!.y} C ${point(output)!.x + 80} ${point(output)!.y}, 760 260, 802 260`} className="edit-wire" />}
        {inputs.map(input => <g key={input.id} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
          <rect x={input.x} y={input.y} width="72" height="36" rx="5" className="canvas-input" onPointerDown={event => { if (event.button !== 0) return; drag.current = { kind: 'input', id: input.id, x: input.x, y: input.y, clientX: event.clientX, clientY: event.clientY }; event.currentTarget.parentElement?.setPointerCapture(event.pointerId) }} />
          <text x={input.x + 36} y={input.y + 23} className="canvas-label">{input.name}</text>
          <circle cx={input.x + 80} cy={input.y + 18} r="9" className={source === `input:${input.name}:${input.id}` ? 'pin selected' : 'pin'} role="button" tabIndex={0} aria-label={`Select output of input ${input.name} block ${input.id}`} onClick={() => setSource(source === `input:${input.name}:${input.id}` ? null : `input:${input.name}:${input.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSource(source === `input:${input.name}:${input.id}` ? null : `input:${input.name}:${input.id}`) } }} />
        </g>)}
        {gates.map(gate => <g key={gate.id} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
          <GateShape gate={gate.gate} x={gate.x} y={gate.y} className="canvas-gate" />
          <rect x={gate.x} y={gate.y - 25} width="90" height="50" className="gate-drag-area" onPointerDown={event => { if (event.button !== 0) return; drag.current = { kind: 'gate', id: gate.id, x: gate.x, y: gate.y, clientX: event.clientX, clientY: event.clientY }; event.currentTarget.parentElement?.setPointerCapture(event.pointerId) }} />
          {gate.sources.map((connection, index) => <circle key={index} cx={gate.x - 8} cy={gate.y + (gate.gate === 'NOT' ? 0 : index === 0 ? -14 : 14)} r="9" className={connection ? 'pin connected' : 'pin'} role="button" tabIndex={0} aria-label={`${gate.gate} ${gate.id} input ${index + 1}${connection ? ', connected' : ', empty'}`} onClick={() => connectGate(gate.id, index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); connectGate(gate.id, index) } }} />)}
          <circle cx={gateOutputX(gate.gate, gate.x)} cy={gate.y} r="9" className={source === `gate:${gate.id}` ? 'pin selected' : 'pin'} role="button" tabIndex={0} aria-label={`Select output of ${gate.gate} ${gate.id}`} onClick={() => setSource(source === `gate:${gate.id}` ? null : `gate:${gate.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSource(source === `gate:${gate.id}` ? null : `gate:${gate.id}`) } }} />
        </g>)}
        <rect x="810" y="238" width="48" height="44" rx="5" className="canvas-output" />
        <text x="834" y="266" className="canvas-label">Q</text>
        <circle cx="802" cy="260" r="9" className={output ? 'pin connected' : 'pin'} role="button" tabIndex={0} aria-label={output ? 'Q input, connected' : 'Q input, empty'} onClick={() => { setOutput(source); setSource(null) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOutput(source); setSource(null) } }} />
      </svg></div>
      <div className="canvas-footer"><span className={compiled.node ? 'circuit-valid' : 'circuit-pending'}>{compiled.node ? `Ready · ${formatExpression(compiled.node)}` : compiled.error}</span><button onClick={() => { setGates([]); setOutput(null); setSource(null) }} disabled={!gates.length && !output}>Clear circuit</button></div>
    </section>

    <section className="exercise-pane" aria-labelledby="exercise-title">
      <div className="pane-toolbar"><h2 id="exercise-title">Truth table</h2><span>{1 << names.length} rows</span></div>
      <div className="exercise-content"><p>The input combinations are supplied. Build the circuit, then generate a blank Q column to practice.</p><button className="generate-button" onClick={generateTable} disabled={!compiled.node}>Generate blank table</button>
        {showTable && <><div className="table-wrap"><table><thead><tr>{names.map(name => <th scope="col" key={name}>{name}</th>)}<th scope="col">Q</th></tr></thead><tbody>{correct.map((value, index) => <tr key={index}>{names.map(name => <td key={name}>{rowInputs(names, index)[name] ? 1 : 0}</td>)}<td><button className={`output-button ${checked ? answers[index] === value ? 'correct' : 'incorrect' : ''}`} onClick={() => cycleAnswer(index)} aria-label={`Row ${index + 1} output, ${answers[index] === null ? 'blank' : Number(answers[index])}`}>{answers[index] === null ? '—' : Number(answers[index])}</button></td></tr>)}</tbody></table></div><div className="exercise-actions"><button onClick={() => setChecked(true)}>Check answers</button><button onClick={() => { setAnswers(Array(correct.length).fill(null)); setChecked(false) }}>Clear answers</button></div>{checked && <p className={score === correct.length ? 'result success' : 'result'} role="status">{score === correct.length ? 'All outputs are correct.' : `${score} of ${correct.length} outputs correct.`}</p>}</>}
      </div>
    </section>
  </div>
}
