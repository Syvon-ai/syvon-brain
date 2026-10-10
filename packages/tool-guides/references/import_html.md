# import_html

Turn HTML into a .dsgn design — the inbound half of export_design format:"html". Pure TypeScript: no Chrome, no render host, no credits. A page THIS system exported round-trips EXACTLY (it carries data-fk stamps, so layout constraints, grid spans, textStyle names, data-slot and var(--color-*) references all come back intact) — so exporting a design to HTML, editing the HTML, and importing it again is a supported way to work. Any other HTML is INFERRED: structure and text come across, every prop is a documented guess, and `notes` says what was guessed or dropped. Colours are mapped back to brand tokens where the brand has them; the ones it does not are listed in `untokenizedColors` — add those to the DNA with write_dna rather than leaving literals in the design. Inference reads inline styles and simple .class/#id/tag rules from the page's own <style> blocks only — there is no browser here, so external stylesheets and anything needing the cascade (Tailwind, real selectors) come back structurally right and visually bare. Always render the result with export_design before calling it done.

## Parameters

### htmlPath — string

Workspace-relative path to the .html file to import. Give this or `html`.

### html — string

The HTML source inline, when it is not a file in the workspace. Give this or `htmlPath`.

### outputPath — string

Workspace-relative path for the .dsgn to write. Defaults to the source file's own name and folder with a .dsgn extension; required when the HTML is passed inline.

### themePath — string

Path to a design-tokens.json, or to a brand folder holding it beside text-styles.json. This is what lets a literal colour be mapped back to var(--color-…) and a font size to the brand's nearest real textStyle name. Omitted, colours stay literal and text styles are guessed from HTML tags — pass the workspace brand whenever there is one.

### width — number

Canvas width for the design. Ignored when the HTML declares its own format (an exported page does). Defaults to 1080.

### height — number

Canvas height. See width. Defaults to 1920.

### dryRun — boolean

Convert and return the .dsgn markup WITHOUT writing it — for inspecting what inference produced before committing a file.

