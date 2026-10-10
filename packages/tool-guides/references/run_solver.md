# run_solver

Load a Solver (.slvr) file, resolve its shell and skills, substitute variables, and run a full agentic loop (with tools) to completion. Returns the assistant response and a summary of tool calls. Use this to execute a solver with a user message and optional variable overrides.

## Parameters

### solverPath — string (required)

Workspace-relative path to the .slvr file.

### userMessage — string (required)

The user message or task to send to the solver.

### variables — object

Optional key/value overrides for {{key}} substitution in the solver prompt (e.g. {"style": "cinematic", "chat": "make it blue"}).

### maxIterations — number

Override max tool-call iterations (default from .slvr or 30).

### inputDir — string

Override solver input directory (workspace-relative).

