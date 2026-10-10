# validate

Check a file before rendering, publishing or pushing it — one call, one verdict, whatever the file is. A .comp or .dsgn has every shot/embed reference resolved and its embed-chain depth checked (a .dsgn also has its design structure validated); a .dsgn or .react is additionally scanned for raw colours that should be brand tokens; a .comp or .dsgn is checked for FORKED layouts (an unedited copy of a templates/ page, one page copied into several projects, a layout borrowed from another project folder — each should be a root-relative link to templates/); a .slvr or .skill is checked as a Solver artifact; a _plan.json against the plan rules; a .flow, or a graph passed inline, against the workflow v1 schema. `checked`/`unchecked` in the result name exactly what ran. Raw colours and forked layouts come back in `advisories`, which report the rule and the fix WITHOUT failing the file — fix them anyway unless the user has said that literal is wanted. It does NOT judge whether copy fits its box — text overflow and cropped subjects are only caught by the optional visual pass, so pass renderPath (a rendered still) to add that (it costs credits). Run this before render_video and before publish_feed: the failures it catches do not throw, they produce a file that looks finished and is wrong.

## Parameters

### path — string

Workspace-relative path to check. Accepts .comp/.seq, .dsgn, .react, .slvr/.skill, a _plan.json, or a .flow — the right checks are chosen from the file.

### graph — object

A workflow node-graph (WorkflowGraphDoc JSON) to check inline, before it is written. Use instead of `path`.

### renderPath — string

Optional. A rendered still of this piece (from a render or export). Adds the visual pass. Costs credits.

### max_depth — number

Maximum allowed embed-chain depth (default 3). Root counts as 0.

