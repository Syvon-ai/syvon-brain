# manage_autopilot

List or edit a project's AUTOPILOTS — recurring worklines that generate on a schedule. Ops: "list" (every autopilot with its cadence and next run); "create" (needs name, prompts, days, time); "update" (change any of name/prompts/days/time/enabled by id); "remove" (by id). Times are UTC. Every run generates, renders and files a DRAFT — nothing reaches a channel until a human publishes it.

## Parameters

### op — string (required)

What to do.

### projectSlug — string

Project whose autopilots to act on. Defaults to the active project.

### id — string

For update/remove: the autopilot id.

### name — string

For create/update: display name.

### prompts — array

For create/update: one generation brief per entry; each run walks the list.

### days — array

For create/update: run days, 0=Sunday … 6=Saturday.

### time — string

For create/update: run time as HH:MM, UTC.

### enabled — boolean

For update: false pauses without deleting.

