# make_piece

Build a NEW piece (a deck, a post, a carousel) from the person's words and YOUR copy. Call it once with `request` alone to see what the library can build and in what shape — it answers with the page kinds available. Then call it again with `pages`: one entry per page, each a short `role` (what that page is FOR) and its `content` — the real words, written under ordinary names (headline, body, quote, attribution, kicker, picture). You do NOT choose templates: a typed decision picks the template for each page from the approved library, and your copy is poured into whatever that template calls those slots. Use this instead of compose_design, use_template + create_sequence, or hydrate_format for anything a person asked for in prose. A page for which no template fits is reported, never faked.

## Parameters

### request — string (required)

The person's words, verbatim.

### project — string (required)

The project folder the piece belongs in, e.g. "projects/q3-review". Must already exist.

### name — string

Filename for the .comp, without extension. Defaults to the project name.

### format — string

The shape, if the person named one — "16:9 deck", "square post", "story", "4:5". Read from the request otherwise.

### pages — array

The plan and the copy, one entry per page, in order.

### pages[].role — string (required)

What this page is FOR, in a few words — "cover", "the one number that matters", "a customer quote", "how to get in touch".

### pages[].content — object (required)

The real words for this page, under ordinary names: headline, body, kicker, quote, attribution, picture (a path), index. Never lorem, never a placeholder token.

### includeUnapproved — boolean

Offer templates nobody has approved. Default false — say which you used so a person can stamp it.

### seconds — number

Seconds per page. Default 3.


## Who does what

You write the PLAN and every WORD. A typed decision picks the template for each
page from the approved library. Code filters by shape, pours your copy into the
chosen template's own slot names, and does the single write.

You never name a template. That is not a restriction on you — it is a
pick-from-a-list problem, and the measured failures of doing it in prose were
building from scratch while three quote templates sat in the catalog, and
putting a PORTRAIT POSTER in a presentation because it was the only candidate
the listing made visible.

## Two calls, normally

1. `make_piece({ request, project })` — answers with the shape it read and the
   page kinds available, then asks for the words.
2. `make_piece({ request, project, pages: [...] })` — one entry per page, in
   order, each with a short `role` and its `content`.

## Writing `content`

Use ordinary names, not the template's: `headline`, `body`, `kicker`, `quote`,
`attribution`, `picture`, `index`. They are mapped by MEANING — a `headline`
lands in whatever the chosen template calls its main line (`stat`, `title`,
`takeaway`), `body` in its supporting line (`context`, `caption`, `subtitle`).
The result names every move, everything that had nowhere to go, and every slot
left empty. Read that back: a page quietly missing its kicker is a bug.

Write REAL copy. Never a placeholder, never `{headline}`, never lorem.

## When it will not build

- **No template fits a page.** Nothing at all is written — not that page, not
  the others. A page in the wrong template is worse than a page that is missing.
  Drop it, describe it differently, or save a template that holds it.
- **The library has no page in that shape.** It says which shapes it does have.
- **Nothing is approved.** Approved templates are the default view. Pass
  `includeUnapproved: true` deliberately, and say which you used so a person can
  stamp it.

## Where the pages end up

A `templates/` page is LINKED, so every piece built on it stays in step. A
`catalog/` page cannot be linked — `catalog/` is not a workspace root, so the
comp would dangle — and is copied into the project instead, exactly as
`use_template` does. The result says which pages were copied.
