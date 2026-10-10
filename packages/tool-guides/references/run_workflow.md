# run_workflow

Run an agent's workflow (its node graph) for a prompt and get the result. Execution happens in the syvon-brain workflow engine. Provide the agent (project) id and a prompt. Returns a summary of the produced composition (name, voice line, number of designs, destination). Use this to invoke a packaged agent workflow as a callable unit.

## Parameters

### agentId — string (required)

The agent (project) id whose workflow to run.

### prompt — string (required)

The prompt / input for the run.

