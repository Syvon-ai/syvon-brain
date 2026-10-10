# bake_project

Propose a bake run for the active project — a queue of assets to hydrate directly. Use when the user asks for multiple new assets (3+ variants, a batch of cards) on the project editor surface. Opens a confirmation modal with the plan; the user must confirm before credits are spent. DO NOT call this for single-asset edits — use generate_image / write_file directly for those.

## Parameters

### reason — string (required)

Short (1–2 sentences) explanation of what you want to bake and why. Shown to the user in the modal header.

### assets — array (required)

Ordered list of assets to hydrate. Each item is a short brief the bake loop turns into a file in Projects/{slug}/.

### assets[].title — string (required)

Display title for the modal — the user sees this while the item bakes.

### assets[].brief — string (required)

One-sentence creative brief for the asset.

### assets[].format — string

Optional format hint (e.g. 'big-text', 'carousel-v1'). Agent should use list_formats to pick a valid name if unsure.

