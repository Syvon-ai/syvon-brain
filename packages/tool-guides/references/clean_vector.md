# clean_vector

Clean up an existing SVG in the workspace so it behaves like a proper logo asset: strips the opaque background the file may be carrying, reduces it to a ONE-COLOUR silhouette whose counters are real holes (so it can be inked any colour, on any background, by whatever places it), and re-frames it onto a centred square artboard with a consistent safe zone. Use it on any mark that was uploaded, imported, hand-drawn or generated before this existed — and to make a folder of logos sit at one optical size. It changes only colour and framing: no path is redrawn, so it is lossless and safe to run twice. For a NEW mark, generate_vector with silhouette:true already does this.

## Parameters

### path — string (required)

Workspace-relative path to the .svg to clean, e.g. assets/logos/acme-mark.svg.

### out — string

Optional workspace-relative destination (.svg). Defaults to overwriting the source in place, which is usually what you want — the operation is lossless and idempotent.

### safeRatio — number

How much of the square artboard the artwork fills, 0 to 1. Defaults to 0.82, which leaves a 9% margin on every side — the clear space an identity spec would ask for. Lower it for a mark that needs to sit smaller in its box.

