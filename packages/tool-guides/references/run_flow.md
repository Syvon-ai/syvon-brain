# run_flow

Run a workflow sub-flow (.flow under a workflow's flows/ folder) by its ref and get the outputs. Provide flowRef (the flow file name without .flow), optional workflowSlug (the parent workflow; defaults to the active workflow), and optional inputs (named values mapping to the flow's io.variable inputs). Runs in the syvon-brain engine, billed to the workspace. Returns the flow’s named outputs.

## Parameters

### flowRef — string (required)

Flow file name without the .flow suffix.

### workflowSlug — string

Parent workflow slug (the flow lives under workflows/{slug}/flows/). Defaults to the active workflow.

### inputs — object

Named inputs for the flow (keys = io.variable names).

