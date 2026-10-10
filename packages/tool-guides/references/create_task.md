# create_task

File findings on the card log. A card is one of two ACTS and they are not interchangeable: a REVIEW is a verdict on something that already exists, so it needs a `target` — this is what a review pass produces, one card per finding, each naming the object it is about. A TICKET is an ask for something not made yet, so it needs an `agent` to be addressed to and carries no rating, because there is nothing to judge. `act` defaults to review, which is almost always what you want. Pass them all in one call — a pass is many findings and this writes them in a single append. Every ticket is recorded as written BY AN AGENT and can never claim otherwise. It will not set a rating and will not mark anything done or reviewed: how good the work is, and whether it is accepted, stay the person's. A ticket with `agent` set is queued to that lane; without one it lands open for a person or the lineup to route. Use `after` to say what has to be finished first — the card you were working when you found this one usually belongs there, and nobody will be handed the ticket until that card is done. Read the queue back with list_tasks; move a ticket with resolve_task.

## Parameters

### cards — array (required)

The tickets to write. One per finding.

### cards[].act — string

review (default) = a verdict on something that EXISTS; needs target. ticket = an ask for something NOT yet made; needs agent, takes no rating.

### cards[].target — string (required)

Workspace-relative path of the object this is about — a folder ("projects/catalog-layout") or a file ("apps/studio/src/features/flow/FlowApp.tsx"). The empty string means the workspace itself.

### cards[].at — string

The part of the target it is about, when it is not the whole thing — "video/shot-2", "page-3/headline", or for code the symbol or line ("AgentPane:142"). Omit for the whole object.

### cards[].kind — string (required)

What the ticket ASKS FOR. "correction" = it is wrong, put it right. "change" = it works, make it different. "variation" = try another version alongside. "repair" = it is broken. "reconnection" = it points at the wrong thing, rewire it.

### cards[].instruction — string (required)

What to change, concretely enough to work to without seeing what you saw. Name the symptom AND the object; "too tight" is not a brief. Trimmed to 80 words.

### cards[].urgency — integer

Where it lands in the queue — 5 is worked first. Defaults to 3. This is how much it BLOCKS, which is a different question from how good the thing is (that is the rating, and it is not yours to set).

### cards[].agent — string

The lane this ticket is handed to, which queues it. Omit to leave it open for a person to route.

### cards[].after — array

Card ids that must reach done or reviewed before this one may be started — file a ticket you found mid-card with the id of the card you were on. It only holds work back; it cannot move anything forward, and an id naming no card counts as finished.

