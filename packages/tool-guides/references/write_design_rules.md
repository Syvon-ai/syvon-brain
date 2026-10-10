# write_design_rules

File the design rules read off a reference. By DEFAULT they land in a sidecar beside the reference itself (.meta/<file>.rules.json) — durable, addressable, and in nobody's prompt, because a reading of one reference is not the brand's design language. Pass scope:"brand" ONLY when the user asked for these rules to govern future work: that promotes the prose into meta/design.md (read by every chat turn and every generation) and binds a method doc through config/skills.json, ideally with workflowSlug so it governs one kind of piece. Measure with analyze_reference_layout / analyze_reference_motion first; every rule must carry its evidence.

## Parameters

### source — string (required)

Workspace-relative path to the reference these rules were read from. Required: the default filing is a sidecar beside this file.

### rules — array (required)

The rules, in order. Each is { rule, evidence, applies_when?, id?, kind? }. `rule` is an instruction a later designer can follow without seeing the reference; `evidence` is the measurement that supports it (a bounding box, a sampled token, a beat count) and is REQUIRED; `kind` is layout | type | color | motion.

### rules[].id — string

R1…Rn. Assigned in order when omitted.

### rules[].rule — string (required)

The instruction.

### rules[].evidence — string (required)

What in the reference supports it.

### rules[].applies_when — string

The condition under which the rule binds — OMIT IT for a universal rule. It must name a real test a later pass can apply ("the piece states a figure"). Never write "always": that is a universal rule with a condition bolted on.

### rules[].kind — string

layout | type | color | motion.

### brief — string

Optional prose — what the reference is, why it works, the structure worth reusing. Stored in the sidecar, and leads the brief when promoted. Markdown, no top heading.

### scope — string

Where the rules apply. "reference" (default) files the sidecar only and changes no prompt. "brand" also promotes them into the brand DNA so every later generation composes against them — use it only when the user asked for that.

### workflowSlug — string

scope:"brand" only. Bind the method doc to ONE flow instead of a whole route — the right choice when the rules describe a KIND of piece. Rules read off a presentation slide should bind the presentations flow, not every generation in the workspace.

### routes — array

scope:"brand" only, and only without workflowSlug. Extra routes besides `generate`: chat | narrate | orchestrate | all.

### skillName — string

scope:"brand" only. Method-doc base name under assets/skills/. Default "design-rules".

