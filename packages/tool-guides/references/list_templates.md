# list_templates

List the design templates available as REFERENCES — real, working .dsgn / .comp / .react pieces to build from. Two libraries in one list: this workspace's own (templates/) first, then the shared platform catalog (catalog/templates/). Read one before building the same kind of thing from scratch, copy one into a project with use_template, or pass its ref to generate as grounding. Templates are REFERENCES, not process — for the steps a generation runs through, that is a Flow (list_flows).

## Parameters

### scope — string

Which library to list. 'workspace' = this brand's own references, 'catalog' = the shared platform set, 'all' (default) = both, workspace-first.

### type — string

Only templates of this kind (.dsgn / .comp / .react).

### includeUnapproved — boolean

Show templates nobody has approved for this workspace yet. Off by default: an approved set is what someone vetted for this brand. Turn it on to browse the whole library — then say which one you used and that it is unapproved, so a person can stamp it.

## Page kinds

Each `.dsgn` in a listing carries its kind in brackets — `03-stat.dsgn [stat]`,
`proof-4x5.dsgn [photo]`. That is what the page IS, from its own header, and it
is what a request should match on: "another product page" means a `[product]`
page, falling back to `[photo]` when the library holds none. The filename does
not say — a carousel's product page is often called `proof`.
