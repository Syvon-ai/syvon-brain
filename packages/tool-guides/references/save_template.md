# save_template

Save a finished piece into this workspace's own reference library (templates/), so later work can build from it. Pass the file to keep and a short slug; companion files (a deck's designs, an imported asset) go in `files`. Updates templates/index.json so the entry is visible to list_templates, use_template and generate. Use when the user says "keep this as a template / as our reference / use this style from now on". This is a REFERENCE, not a process — a repeatable set of STEPS is a Flow (create_workflow).

## Parameters

### slug — string (required)

Short lowercase hyphenated name for the template, e.g. "quote-poster". Becomes the folder templates/{slug}/. An existing slug is replaced.

### sourcePath — string (required)

The MAIN file to keep, relative to workspace root — a .dsgn, .comp or .react (e.g. "projects/spring/hero.dsgn").

### title — string

Human title shown in the library. Defaults to the file name.

### teaches — string

One line on what this template demonstrates — the reason someone should open it rather than invent one. Worth writing: it is what a later session reads when choosing.

### files — array

Companion files the piece needs (a .comp's designs, a component's asset), relative to workspace root. Omit for a single-file template.

### purpose — string

For a .comp: 2–5 plain sentences on what this template is FOR — the situation, who it is for, how often it is made, its tone, and when a sibling fits better. Written into the template's source, where the matcher reads it to pick this template for what someone asks. Write it the way a person describes the piece, not the layout.

### bestFor — array

For a .comp: 3–6 short phrases a person might type when they want this ("board update", "quarterly review").

### pageJobs — object

For a .comp: one plain line per page, keyed by page file or stem ("06-stat": "The one number the quarter turns on."), saying what the page carries and when to keep or drop it.

## What it writes into the pages

Every saved `.dsgn` gets an `@kind:` line in its header — the one word a person
would call that page (`cover`, `stat`, `quote`, `product`, `photo`, `list`,
`compare`, `pricing`, `cta`, `close`, `chart`, `table`, `gallery`, `agenda`,
`section`, `text`, `logo`). It is taken from the page's own `@role` when that
says, and picked by a typed decision otherwise. It is what lets a later request
like "add another product page" find this template, so nothing else in the file
is touched. A page whose kind is not clear is saved untagged rather than guessed.

## What it writes into the source

A saved `.comp` gets its source beside it (`<stem>.mdx`) — the project deck's
own, pointed at the saved comp, or one written from the comp and its pages.
`title`, `purpose`, `bestFor` and `pageJobs` go into it: the title, the text
under the header with its `Best for:` line, and a first line on each page's
part. The words on the pages are not touched.

That source is what a drafted intent is matched against: a part that says
"product launch reel" finds this template by its purpose and Best for phrases,
and this workspace's own templates are asked before the catalog. So when you
save a deck, always pass `purpose`, `bestFor` and `pageJobs` — write them the
way a person describes the piece, not the layout, and say what makes it
different from the templates already in the library. A deck saved without
them is matched on its title and page names alone.
