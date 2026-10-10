# promote_draft

Turn a saved draft into a card on the workspace queue — this is what "actually do that one", "make it a ticket", "queue it up" means. Name the lane in `agent` and it is filed as a TICKET queued to that lane; leave it out and it is filed OPEN, for a person to route. Either way the card points back at the draft, so whoever works it can read the whole note. It never sets a rating and never marks anything done or reviewed — how good the work is, and whether it is accepted, stay the person's. A draft can only be promoted once; ask first if the user has not clearly asked for the work to be queued. Find the draft with list_drafts; read the queue back with list_tasks.

## Parameters

### id — string (required)

The draft, by id (from list_drafts or save_draft), by path, or by its title.

### agent — string

The lane to hand it to, which QUEUES it. Defaults to the lane the draft was saved with. Omit entirely to file it open for a person to route.

### kind — string

What the card ASKS FOR. "correction" = it is wrong, put it right. "change" (default) = it works, make it different. "variation" = try another version alongside. "repair" = it is broken. "reconnection" = it points at the wrong thing.

### instruction — string

The brief, if the note itself is not one. Defaults to the draft's title and opening lines. Trimmed to 80 words.

### urgency — integer

Where it lands in the queue — 5 is worked first. Defaults to 3. This is how much it BLOCKS, not how good anything is.

### target — string

What the card is about, if it is not what the draft already named. Defaults to the draft's target, and to the draft file itself when it named none.

### folder — string

Where the draft is kept, if not the default (this conversation's project, or meta/drafts).

