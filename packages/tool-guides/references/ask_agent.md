# ask_agent

Hand a task to another agent and wait for its result. Use list_agents FIRST to see who exists and which tools each one exposes — the handle and tool must both be real or the request is refused. Every step is recorded as a signed receipt chain. Delegate only when the task genuinely belongs to another agent (a maker builds inside a workspace, an engineer writes code in a repo); answer it yourself when you can.

## Parameters

### handle — string (required)

The target agent's @handle, without the @. Must appear in list_agents.

### tool — string (required)

The tool for that agent to run. Must be one this agent exposes (see list_agents).

### args — object

Arguments for the tool, as an object.

### task — string

One line on WHY, in plain language. Recorded on the receipt so the chain explains itself later; it does not change what runs.

