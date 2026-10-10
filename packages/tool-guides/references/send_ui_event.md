# send_ui_event

Move the interface to another screen by firing an event declared in the agent's .gflow — e.g. "agent.selected" to enter an agent, "zoom-out" to return to the roster. Use this when the conversation should change WHAT IS ON SCREEN, not what is being said. The surface applies it through the same permission check a user gesture uses, so a transition the agent is not allowed to fire is refused rather than forced.

## Parameters

### event — string (required)

The transition event name, exactly as the .gflow declares it (e.g. "agent.selected", "zoom-out").

### target — string

Optional subject the screen should focus — usually an agent slug or handle, e.g. "acme". Passed to the screen as a param; ignored by screens that take none.

### reason — string

Six words or fewer on why the view is changing. Shown to the visitor so a screen change is never unexplained.

