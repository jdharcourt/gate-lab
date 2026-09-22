# Gate Lab

A local Next.js workbench for Boolean logic.

Run `npm install`, then `npm run dev` and open [http://127.0.0.1:3000](http://127.0.0.1:3000).

- Draw circuit: add gates from the left, click a source dot and then a gate input or Q, and drag gates to arrange them. Once the circuit is complete, generate a blank truth table and check your outputs.
- Build expression: type a formula or insert input and gate blocks. The table and IEC-style gate diagram update as you type.
- Practice: one truth-table output is supplied. Fill the other outputs and check your answers.
- From truth table: add up to four inputs and switch each output between 0 and 1. A simplified sum-of-products expression and circuit are generated automatically.

Expressions accept single-letter inputs, `NOT`, `AND`, `OR`, `XOR`, `NAND`, `NOR`, `XNOR`, and `XAND` (an alias for `XNOR`). Parentheses and `!`, `&`, `|`, `^` are also supported. `NOT` binds most tightly, followed by AND/NAND, XOR/XNOR, then OR/NOR.

Run `npm test` for the logic checks and `npm run build` for a production build. All work stays in the browser; there are no accounts or server-side data writes.
