# review_composition

Lint a .comp or .dsgn before it is rendered, published or pushed. For a .comp: EVERY shot ref (source / inlineShot.templatePath / resolved.templatePath) is resolved with the canonical rule (a path starting templates|projects|workflows|flows|brands|assets|.syvon|.renders resolves against the WORKSPACE ROOT; anything else — a bare filename, ./x, sub/x — resolves against the COMP'S OWN DIRECTORY; there is no fallback) and confirmed to exist. A ref that does not resolve is a `dangling_shot_ref` finding carrying the resolved path plus ranked same-name candidates and, when unambiguous, a suggestedRef to apply. THIS CHECK IS NOT OPTIONAL BEFORE A RENDER OR A PUBLISH: a dangling ref does not throw anywhere — the render stage paints "Design content HTTP 404" as a card, still signals ready, and the encoder bakes that error into every frame of a structurally valid mp4 that publish then accepts. Silent, and it ships. For a .dsgn: checks nested .dsgn embeds exceed 3 levels of depth — emits a flattening suggestion. Returns findings in an agent-actionable shape so the agent can self-heal via apply_diff. Pass renderPath as well to ALSO review the rendered result visually (cropped faces, unreadable text, overflow) — the structural pass cannot see any of that. Use after authoring/editing a .dsgn, and after rendering when the output matters. VISUAL findings are ADVISORY AND UNSTABLE. Measured on a fixed page with a fixed prompt, the same call returned 6 findings on one run and 0 on another, and it does not detect a human head clipped by a frame at page scale at all (0/6 on a page with two visibly decapitated models). Treat a finding as a prompt to go LOOK, never as a verdict, never as a gate, and never bulk-apply. For CROPPING specifically prefer arithmetic: given the source dimensions, the frame aspect and the object-position, whether the subject survives is exactly computable — ask vision WHERE the subject is (once, per image, stored on the image), and ask geometry whether this frame keeps it. Structural findings are deterministic and need no such caution.

## Parameters

### path — string (required)

Workspace-relative path to the .comp or .dsgn file to review.

### max_depth — number

Maximum allowed embed-chain depth (default 3). Lower = stricter. Root counts as 0.

### renderPath — string

Optional workspace-relative path to a RENDERED image of this composition (from export_design or a render). Adds a visual pass that catches what the source cannot show: a face cropped by a frame edge, text over a busy area, an element running out of its box. Findings come back in the same shape, with a suggestedFocus you can apply to the Asset.

