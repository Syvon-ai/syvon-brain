# edit_design_slots

Inspect or change the TEXT of named slots in a .dsgn (data-slot="headline", "eyebrow", …) while leaving every attribute, style and other element untouched. Use this to reword a design — never rewrite a .dsgn wholesale, which loses attributes nobody was looking at. Call it WITHOUT `slots` to inspect: it returns each slot name, its current text and its textStyle, so there is no need to read the design first. Call it WITH `slots` (a map of name → new text) to apply; an empty string clears a slot.

## Parameters

### path — string (required)

Workspace-relative path to the .dsgn file.

### slots — object

Map of slot name → new text, e.g. {"headline": "Three moves."}. Empty string ("") clears a slot. OMIT this to inspect the design's slots and current copy without changing anything.

### media — object

Map of slot name -> workspace-relative media path, e.g. {"media_bg": "projects/x/output/hero.png"}. Sets the `src` of the Asset carrying that data-slot - this is how a generated image is put BACK into the design it was made for. Separate from `slots` because a path belongs in an attribute, not in the body of a Text element.

