# edit_piece

Change an existing piece (.comp) from the PERSON'S OWN WORDS. Pass `request` verbatim — "drop the agenda", "the closing slide should say thanks" — and this tool decides which operation, which page and how far the change reaches, then applies it. You do not choose a verb, an index or a scope; you supply COPY. When the change needs new words, put them in `content` as slot → text (inspect with edit_sequence first if you need the slot names). When the request or the page is ambiguous, or when the change would alter a layout OTHER pieces share, nothing is written and the result is the question to put to the person — ask it, then call again with the answer. Prefer this over edit_sequence for anything a person asked for in prose; reach for edit_sequence directly only for a precise mechanical batch.

## Parameters

### piece — string (required)

Path to the .comp, relative to the workspace root.

### request — string (required)

The person's words, verbatim. Do not summarise or rephrase them into an instruction.

### content — object

NEW copy the change needs, as slot → text (e.g. { "headline": "Launch day" }). Only for changes that write words. Slot names must be ones the page declares.

### page — number

The page number as a PERSON counts it (1 = first), when it is already known — a UI selection, or the answer to a question this tool asked. Omit it otherwise.

### scope — string

Only when the person has been explicit. "shared-design" changes the layout every piece built on it uses, and is never assumed.

### layout — string

restyle / add: the .dsgn to use, when one has been chosen.

### to — number

move: destination page number as a person counts it (1 = first).

### with — number

swap: the other page number, as a person counts it.

### seconds — number

set_duration: how long the page should be on screen.

### ifVersion — any

The version from the last read, to refuse a write onto a file that moved underneath.

## Who decides what

You supply the person's words and, when the change needs them, the WORDS. A
typed decision (`@syvon/decide`) picks the operation, the page and how far the
change reaches. It reads the pages by what they SAY — `page 2 · stat — "41%
faster setup"` — which is how a person names them, so "the stat page" resolves
without you counting indices.

## Four outcomes, never blurred

| `data.outcome` | what happened | what you do |
|---|---|---|
| `committed` | the edit was applied | say what changed |
| `needs_input` | nothing written; the message IS the question | put the question to the person, then call again with the answer |
| `rejected` | nothing written; the request cannot be carried out as stated | say why, in the tool's own words |

A `needs_input` is not a failure to work around. It is the tool refusing to
guess between two readings, and reaching for `edit_sequence` to force the edit
through is how the wrong page gets changed.

## Three questions it will ask

- **What should change** — the request was ambiguous ("fix the second one").
- **Which page** — the request fits more than one, and the candidates are listed.
- **The shared layout** — the change would alter a `.dsgn` that OTHER pieces are
  built from. It names the layout and how many pages use it BEFORE anything is
  written. Only go ahead, with `edit_design_slots`, if the person meant the
  layout itself.

## What it refuses outright

Words for a slot no page holds. "Put our handle on every page" against a deck
with no `handle` slot comes back as one sentence naming the slots the pages DO
hold — adding one is a change to the layout, not to the words.
