# resolve_task

Move a card you are working to "working" (you have started) or "done" (you have finished), with a short account of what you did. This is the only way to change a card. "working" also CLAIMS it — the card is marked as yours, and a card already in another worker's hands is refused rather than worked twice. It is also refused on a card whose `after` still names an unfinished one, which is the order the queue was written in; list_tasks with `ready: true` is what you may start now. It will not set a rating or an urgency and will not mark a card reviewed — those are the person's, and "done" means "I finished", not "this is good". Pair it with append_file_history on each file you actually changed.

## Parameters

### id — string (required)

The card id, from list_tasks.

### status — string (required)

"working" when you pick it up, "done" when you finish it.

### outcome — string

Required with "done": did the attempt WORK? "failure" is a real answer and the useful one — a card you could not finish is still finished with, and saying so is what puts it in front of a person instead of into a pile of green.

### resolution — string

What you did about this card — one or two sentences, what the person will read when deciding whether to accept it. Required for "done". Truncated to 60 words.

### files — array

Files this card created, changed or deleted that you have NOT already recorded with append_file_history. Use it to close the record in one call. Each file gets a version, linked to this card.

### files[].path — string (required)

Workspace-relative path.

### files[].op — string (required)

_no description_

### files[].at — string

The part you touched — "video/shot-2".

### files[].from — string

Where it was, when op is "renamed".

### files[].summary — string

What you did to this file.

