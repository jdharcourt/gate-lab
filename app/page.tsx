'use client'

import { useMemo, useRef, useState } from 'react'
import { Circuit } from './Circuit'
import { DiagramEditor } from './DiagramEditor'
import { evaluate, formatExpression, fromTruthTable, inputsIn, parseExpression, rowInputs, type Node } from './logic'

type Mode = 'diagram' | 'build' | 'practice' | 'table'

const problems = ['A AND B', 'A OR B', 'A XOR B', 'NOT A AND B', '(A OR B) AND C', 'A XNOR B', 'A NAND B', 'A NOR B']
const operators = ['AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', 'XNOR', 'XAND']

export default function Page() {
  const [mode, setMode] = useState<Mode>('diagram')
  const [expression, setExpression] = useState('A XOR B')
  const [tableNames, setTableNames] = useState(['A', 'B'])
  const [tableOutputs, setTableOutputs] = useState<(boolean | null)[]>([false, true, true, false])
  const [problem, setProblem] = useState(0)
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(4).fill(null))
  const [checked, setChecked] = useState(false)
  const [selectedRow, setSelectedRow] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => {
    try {
      return { node: parseExpression(mode === 'practice' ? problems[problem] : expression), error: '' }
    } catch (error) {
      return { node: null, error: error instanceof Error ? error.message : 'Invalid expression.' }
    }
  }, [expression, mode, problem])
  const node = mode === 'table' ? fromTruthTable(tableNames, tableOutputs) : parsed.node
  const names = mode === 'table' ? tableNames : node ? inputsIn(node) : []
  const rowCount = 1 << names.length
  const currentRow = Math.min(selectedRow, rowCount - 1)
  const values = rowInputs(names, currentRow)
  const givenRow = problem % (1 << inputsIn(parseExpression(problems[problem])).length)
  const correct = mode === 'practice' && node ? Array.from({ length: rowCount }, (_, index) => evaluate(node, rowInputs(names, index))) : []
  const score = correct.reduce((total, value, index) => total + (index !== givenRow && answers[index] === value ? 1 : 0), 0)

  function insert(value: string) {
    const field = inputRef.current
    const start = field?.selectionStart ?? expression.length
    const end = field?.selectionEnd ?? expression.length
    const addition = operators.includes(value) ? value === 'NOT' ? 'NOT ' : ` ${value} ` : value
    setExpression(expression.slice(0, start) + addition + expression.slice(end))
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(start + addition.length, start + addition.length)
    })
  }

  function changeMode(next: Mode) {
    setMode(next)
    setSelectedRow(0)
  }

  function nextProblem() {
    const next = (problem + 1) % problems.length
    setProblem(next)
    setAnswers(Array(1 << inputsIn(parseExpression(problems[next])).length).fill(null))
    setChecked(false)
    setSelectedRow(0)
  }

  function addInput() {
    if (tableNames.length >= 4) return
    setTableOutputs(tableOutputs.flatMap(value => [value, value]))
    setTableNames([...tableNames, 'ABCD'[tableNames.length]])
    setSelectedRow(0)
  }

  function removeInput() {
    if (tableNames.length <= 1) return
    setTableOutputs(tableOutputs.filter((_, index) => index % 2 === 0))
    setTableNames(tableNames.slice(0, -1))
    setSelectedRow(0)
  }

  function cycleOutput(index: number) {
    const updated = [...tableOutputs]
    updated[index] = updated[index] === null ? false : !updated[index]
    setTableOutputs(updated)
    setSelectedRow(index)
  }

  function cycleAnswer(index: number) {
    const updated = [...answers]
    updated[index] = updated[index] === null ? false : updated[index] === false ? true : null
    setAnswers(updated)
    setChecked(false)
    setSelectedRow(index)
  }

  return <main className="app">
    <header className="topbar">
      <div className="brand">Gate Lab</div>
      <span className="topbar-note">Logic design and practice</span>
    </header>
    <nav className="tabs" aria-label="Workspace mode">
      <button className={mode === 'diagram' ? 'active' : ''} onClick={() => changeMode('diagram')} aria-current={mode === 'diagram' ? 'page' : undefined}>Draw circuit</button>
      <button className={mode === 'build' ? 'active' : ''} onClick={() => changeMode('build')} aria-current={mode === 'build' ? 'page' : undefined}>Build expression</button>
      <button className={mode === 'practice' ? 'active' : ''} onClick={() => changeMode('practice')} aria-current={mode === 'practice' ? 'page' : undefined}>Practice</button>
      <button className={mode === 'table' ? 'active' : ''} onClick={() => changeMode('table')} aria-current={mode === 'table' ? 'page' : undefined}>From truth table</button>
    </nav>

    <div className="diagram-host" hidden={mode !== 'diagram'}><DiagramEditor /></div>
    <div className="workspace" hidden={mode === 'diagram'}>
      <section className="editor panel" aria-labelledby="editor-title">
        {mode === 'build' && <>
          <h1 id="editor-title">Build an expression</h1>
          <p className="section-intro">Type directly or insert a block at the cursor.</p>
          <label htmlFor="expression">Expression</label>
          <input id="expression" ref={inputRef} value={expression} onChange={event => setExpression(event.target.value)} maxLength={256} spellCheck={false} autoComplete="off" aria-describedby="expression-help expression-error" />
          <p id="expression-help" className="hint">Use A–Z, parentheses, and the gate buttons. XAND is another name for XNOR. Up to four inputs.</p>
          {parsed.error && <p id="expression-error" className="error" role="alert">{parsed.error}</p>}
          <h2>Inputs</h2>
          <div className="block-row">{'ABCD'.split('').map(name => <button className="block input-block" key={name} onClick={() => insert(name)}>{name}</button>)}<button className="block" onClick={() => insert('(')}>(</button><button className="block" onClick={() => insert(')')}>)</button></div>
          <h2>Gates</h2>
          <div className="block-row">{operators.map(gate => <button className="block" key={gate} onClick={() => insert(gate)}>{gate}</button>)}</div>
          <div className="example"><span>Try an example</span><button onClick={() => setExpression('(A AND B) OR NOT C')}>(A AND B) OR NOT C</button></div>
        </>}
        {mode === 'practice' && <>
          <h1 id="editor-title">Complete the table</h1>
          <p className="section-intro">One output is given. Fill the rest, then check your work.</p>
          <div className="problem"><span>Expression</span><strong>{problems[problem]}</strong></div>
          <div className="actions"><button className="primary" onClick={() => setChecked(true)}>Check table</button><button onClick={nextProblem}>Next problem</button></div>
          {checked && <p className={score === rowCount - 1 ? 'result success' : 'result'} role="status">{score === rowCount - 1 ? 'Correct — every output matches.' : `${score} of ${rowCount - 1} answers correct. Review the marked rows.`}</p>}
          <p className="hint">Click an empty output to choose 0 or 1. Click again to change it.</p>
        </>}
        {mode === 'table' && <>
          <h1 id="editor-title">Make a circuit from a table</h1>
          <p className="section-intro">Choose the output for each input combination. The expression and circuit update automatically.</p>
          <div className="input-control"><span>Inputs</span><div className="input-list">{tableNames.map(name => <span className="input-name" key={name}>{name}</span>)}</div></div>
          <div className="actions"><button onClick={addInput} disabled={tableNames.length === 4}>Add input</button><button onClick={removeInput} disabled={tableNames.length === 1}>Remove input</button></div>
          <p className="hint">Up to four inputs. Every combination is listed in the table; click a Q value to switch between 0 and 1.</p>
          <div className="derived"><span>Derived expression</span><strong>{node ? formatExpression(node) : 'Set every output to 0 or 1'}</strong></div>
        </>}
      </section>

      <section className="truth panel" aria-labelledby="truth-title">
        <div className="panel-heading"><h2 id="truth-title">Truth table</h2><span>{names.length ? `${rowCount} combinations` : 'No inputs'}</span></div>
        {node ? <>
          <div className="table-wrap"><table><thead><tr>{names.map(name => <th key={name} scope="col">{name}</th>)}<th scope="col">Q</th></tr></thead><tbody>
            {Array.from({ length: rowCount }, (_, index) => {
              const row = rowInputs(names, index)
              const output = mode === 'table' ? tableOutputs[index] : evaluate(node, row)
              const isGiven = mode === 'practice' && index === givenRow
              return <tr key={index} className={index === currentRow ? 'selected' : ''} onClick={() => setSelectedRow(index)}>
                {names.map(name => <td key={name}>{row[name] ? '1' : '0'}</td>)}
                <td className="output-cell">{mode === 'practice' && !isGiven ? <button className={`output-button ${checked ? answers[index] === correct[index] ? 'correct' : 'incorrect' : ''}`} onClick={() => cycleAnswer(index)} aria-label={`Row ${index + 1} output, ${answers[index] === null ? 'unset' : Number(answers[index])}`}>{answers[index] === null ? '—' : Number(answers[index])}</button>
                  : mode === 'table' ? <button className="output-button" onClick={() => cycleOutput(index)} aria-label={`Row ${index + 1} output, ${output === null ? 'unset' : Number(output)}`}>{output === null ? '—' : Number(output)}</button>
                    : <span className={isGiven ? 'given-output' : ''}>{Number(output)}</span>}</td>
              </tr>
            })}
          </tbody></table></div>
          <p className="table-note">{mode === 'practice' ? 'Shaded output is the given answer.' : 'Select a row to inspect its signals in the circuit.'}</p>
        </> : <div className="empty-state">{mode === 'table' ? 'Complete the outputs to generate a circuit.' : 'Fix the expression to generate its truth table.'}</div>}
      </section>

      <section className="diagram panel" aria-labelledby="diagram-title">
        <div className="panel-heading"><h2 id="diagram-title">Gate diagram</h2>{node && <span>Row {currentRow + 1} selected</span>}</div>
        {node ? <><Circuit node={node} values={values} /><div className="signal-key"><span><i className="key-line high" /> 1 · high</span><span><i className="key-line" /> 0 · low</span></div></>
          : <div className="empty-state">{mode === 'table' ? 'Complete the outputs to generate a circuit.' : 'Fix the expression to generate a circuit.'}</div>}
      </section>
    </div>
  </main>
}
