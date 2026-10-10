# save_draft

Save a note, an idea or a request into the workspace as a DRAFT — one markdown file, kept for later. This is the answer to "save this to Syvon", "keep this for later", "note this down", "add this to my list". A draft commits to nothing: it is not queued, nobody is assigned, and it does not appear in anyone's work. It comes back with an id, and promote_draft turns it into a ticket on the queue when — and only when — the user asks for that. Use list_drafts to read them back. If the user asks for the work to be QUEUED in the same breath ("save this and have the team do it"), save it here and then call promote_draft; do not skip the draft, it is what the ticket points at.

## Parameters

### title — string (required)

A short handle for the note, in the user's own words — it names the file and is how they will ask for it again. Trimmed to 120 characters.

### body — string (required)

The note itself, in full. Write what the user actually said, not a summary of it — this is read weeks later by someone who was not in this conversation. Markdown.

### target — string

Workspace-relative path this note is ABOUT, when it names something — a project ("projects/spring-reel") or a file. Omit when it is a loose idea. Becomes the ticket's target if the draft is promoted.

### tags — array

Free labels, the user's own words ("idea", "bug", "campaign").

### agent — string

The lane the user said should eventually work this. Recorded only — it queues nothing. promote_draft uses it as the default when the ticket is finally filed.

### folder — string

Where to keep it. Defaults to this conversation's project (projects/{slug}/drafts) or meta/drafts when there is no project. Pass one only when the user names a place.

