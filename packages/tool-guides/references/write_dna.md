# write_dna

Write or update a brand DNA file (brand, design-tokens, text-styles, or animation). Automatically resolves the file path (routes to the active brand folder when available, legacy fallback otherwise) and creates a history snapshot before overwriting. ALWAYS use this instead of write_file for DNA — a raw write resolves no brand folder, so the edit can land in the wrong brand, and takes no snapshot, so it cannot be undone. Changing text-styles or design-tokens is brand-wide — it restyles EVERY design and comp that references them, not the one file in front of you; make the change at the most local level that fixes the problem (a slot edit, then one design) and only edit DNA when the change is genuinely meant for the whole brand.

## Parameters

### file — string (required)

Which DNA file to write.

### data — object (required)

The full JSON object to write as the DNA file content. design-tokens is design-tokens/v2: { "version": 2, "variables": { "color.text": { "type": "color", "value": "#EDEDED", "modes": { "light": { "ref": "color.background", "mode": "default" } } } }, "modes": { "light": { "label": "Light", "scheme": "light" } } }. `value` is always the base palette; each variable's `modes` entry is its value in that colour mode — a literal { "value" } or a link { "ref", "mode"? } (mode omitted = the same mode, "default" = the base palette).

