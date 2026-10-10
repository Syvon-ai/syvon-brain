# list_agents

List the agents on this network and what each one is for. Returns each agent's handle, archetype (assistant | maker | engineer), a one-line description of what it does, and the tools it exposes. Use this BEFORE ask_agent to decide who to hand a task to — never guess a handle. Most agents have no archetype set; that says nothing about whether they can take work, so they are listed. Pass `archetype` to narrow to a posture.

## Parameters

### archetype — string

Only agents of this posture. "maker" builds things inside a workspace; "engineer" writes code in a repo; "assistant" orchestrates. Omit to see everyone.

