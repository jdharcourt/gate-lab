'use client'

import { useMemo, useRef, useState } from 'react'
import { compileDiagram, evaluate, formatExpression, rowInputs, type DiagramGate, type Gate } from './logic'

const gateTypes: (Gate | 'NOT')[] = ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR']

export function DiagramEditor() {
  const [names, setNames] = useState(['A', 'B'])
  const [gates, setGates] = useState<DiagramGate[]>([])
  const [output, setOutput] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [generated, setGenerated] = useState('')
  const [answers, setAnswers] = useState<(boolean | null)[]>([])
  const [checked, setChecked] = useState(false)
  const nextId = useRef(1)
  const drag = useRef<{ id: number; x: number; y: number; clientX: number; clientY: number } | null>(null)

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
      const index = names.indexOf(connection.slice(6))
      return index < 0 ? null : { x: 116, y: 120 + index * (300 / Math.max(1, names.length - 1)) }
    }
    const gate = gates.find(item => connection === `gate:${item.id}`)
    return gate ? { x: gate.x + 98, y: gate.y } : null
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

  function removeInput() {
    if (names.length === 1) return
    const removed = names[names.length - 1]
    setNames(names.slice(0, -1))
    setGates(gates.map(gate => ({ ...gate, sources: gate.sources.map(current => current === `input:${removed}` ? null : current) })))
    if (output === `input:${removed}`) setOutput(null)
    if (source === `input:${removed}`) setSource(null)
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
      <p>Add gates, then connect an output dot to a gate input or Q. Drag a gate to move it.</p>
      <h2>Inputs</h2>
      <div className="tool-inputs">{names.map(name => <span key={name}>{name}</span>)}</div>
      <div className="tool-actions"><button onClick={() => setNames([...names, 'ABCD'[names.length]])} disabled={names.length === 4}>Add input</button><button onClick={removeInput} disabled={names.length === 1}>Remove</button></div>
      <h2>Gates</h2>
      <div className="gate-tools">{gateTypes.map(gate => <button key={gate} onClick={() => addGate(gate)} disabled={gates.length === 10}><span className="tool-glyph">{gate === 'NOT' ? '¬' : gate === 'XOR' || gate === 'XNOR' ? '⊕' : gate === 'OR' || gate === 'NOR' ? '≥' : '&'}</span>{gate}</button>)}</div>
      {gates.length > 0 && <><h2>On canvas</h2><ul className="gate-list">{gates.map(gate => <li key={gate.id}><span>{gate.gate} {gate.id}</span><button onClick={() => removeGate(gate.id)} aria-label={`Remove ${gate.gate} ${gate.id}`}>Remove</button></li>)}</ul></>}
    </aside>

    <section className="canvas-pane" aria-labelledby="canvas-title">
      <div className="pane-toolbar"><h2 id="canvas-title">Circuit canvas</h2><span>{source ? `Connecting ${source.startsWith('input:') ? source.slice(6) : source.replace('gate:', 'gate ')} — choose a target pin` : 'Click a dot to start a wire'}</span></div>
      <div className="canvas-scroll"><svg className="edit-canvas" viewBox="0 0 880 520" width="880" height="520" aria-label="Editable logic gate circuit">
        <path d="M 145 0 V 520 M 792 0 V 520" className="canvas-guide" />
        {gates.flatMap(gate => gate.sources.map((connection, index) => {
          const start = connection ? point(connection) : null
          if (!start) return null
          const endY = gate.y + (gate.gate === 'NOT' ? 0 : index === 0 ? -14 : 14)
          return <path key={`${gate.id}-${index}`} d={`M ${start.x} ${start.y} C ${start.x + 75} ${start.y}, ${gate.x - 65} ${endY}, ${gate.x - 8} ${endY}`} className="edit-wire" />
        }))}
        {output && point(output) && <path d={`M ${point(output)!.x} ${point(output)!.y} C ${point(output)!.x + 80} ${point(output)!.y}, 760 260, 802 260`} className="edit-wire" />}
        {names.map((name, index) => <g key={name}>
          <rect x="36" y={102 + index * (300 / Math.max(1, names.length - 1))} width="72" height="36" rx="5" className="canvas-input" />
          <text x="72" y={125 + index * (300 / Math.max(1, names.length - 1))} className="canvas-label">{name}</text>
          <circle cx="116" cy={120 + index * (300 / Math.max(1, names.length - 1))} r="9" className={source === `input:${name}` ? 'pin selected' : 'pin'} role="button" tabIndex={0} aria-label={`Select output of input ${name}`} onClick={() => setSource(source === `input:${name}` ? null : `input:${name}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSource(source === `input:${name}` ? null : `input:${name}`) } }}><title>Output of {name}</title></circle>
        </g>)}
        {gates.map(gate => <g key={gate.id} onPointerMove={event => {
          if (drag.current?.id !== gate.id) return
          const width = event.currentTarget.ownerSVGElement?.getBoundingClientRect().width ?? 880
          setGates(current => current.map(item => item.id === gate.id ? { ...item, x: Math.max(170, Math.min(680, drag.current!.x + (event.clientX - drag.current!.clientX) * 880 / width)), y: Math.max(45, Math.min(475, drag.current!.y + (event.clientY - drag.current!.clientY) * 880 / width)) } : item))
        }} onPointerUp={() => { drag.current = null }}>
          <rect x={gate.x} y={gate.y - 28} width="90" height="56" rx="5" className="canvas-gate" onPointerDown={event => { if (event.button !== 0) return; drag.current = { id: gate.id, x: gate.x, y: gate.y, clientX: event.clientX, clientY: event.clientY }; event.currentTarget.parentElement?.setPointerCapture(event.pointerId) }} />
          <text x={gate.x + 45} y={gate.y + 5} className="canvas-label">{gate.gate}</text>
          {gate.sources.map((connection, index) => <circle key={index} cx={gate.x - 8} cy={gate.y + (gate.gate === 'NOT' ? 0 : index === 0 ? -14 : 14)} r="9" className={connection ? 'pin connected' : 'pin'} role="button" tabIndex={0} aria-label={`${gate.gate} ${gate.id} input ${index + 1}${connection ? ', connected' : ', empty'}`} onClick={() => connectGate(gate.id, index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); connectGate(gate.id, index) } }}><title>{connection ? 'Click to disconnect or replace' : 'Click to connect'}</title></circle>)}
          <circle cx={gate.x + 98} cy={gate.y} r="9" className={source === `gate:${gate.id}` ? 'pin selected' : 'pin'} role="button" tabIndex={0} aria-label={`Select output of ${gate.gate} ${gate.id}`} onClick={() => setSource(source === `gate:${gate.id}` ? null : `gate:${gate.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSource(source === `gate:${gate.id}` ? null : `gate:${gate.id}`) } }}><title>Output of {gate.gate} {gate.id}</title></circle>
        </g>)}
        <rect x="810" y="238" width="48" height="44" rx="5" className="canvas-output" />
        <text x="834" y="266" className="canvas-label">Q</text>
        <circle cx="802" cy="260" r="9" className={output ? 'pin connected' : 'pin'} role="button" tabIndex={0} aria-label={output ? 'Q input, connected' : 'Q input, empty'} onClick={() => { setOutput(source); setSource(null) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOutput(source); setSource(null) } }}><title>{output ? 'Click to disconnect or replace' : 'Connect circuit output'}</title></circle>
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
