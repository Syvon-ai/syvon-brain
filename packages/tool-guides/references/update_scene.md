# update_scene

Build or update the SCENE for the current message — the answer the user sees as an interface, not as chat text. A scene holds the outcome options the user can pick ("Recreate the motion" — outcome-level, in their language, never tool names) and the files the work produced; the app renders both as cards and the user picks, rates, and points at them there. Call it the moment you have useful outcomes to offer (Direct), again while working (states, new members), and once more when work is ready for Review. Idempotent per `id`: repeat calls patch the same scene. `setOptions` replaces the menu but keeps each surviving option’s state; `addMembers` appends produced files; `setOptionState` flips one option.

## Parameters

### id — string (required)

Stable kebab id for this answer, e.g. "ways-in" or "spring-launch-deck". One id per message answered; the same id updates the same scene.

### title — string

The answer’s headline — "Three ways in", "The brand, applied". Required on create.

### sessionId — string

The conversation this answer belongs to, when known.

### project — string

The project slug this answer is about ("spring-launch") — the scene then appears IN that project in the feed. Omit for a workspace-level answer; when omitted, the scene infers its project from its members' paths once they land.

### status — string

"directing" = offering outcomes for a pick. "working" = running the picked one. "directing" = offering outcomes for a pick. "working" = running the picked one. "made" = produced, awaiting the user’s judgment (a Direct round, not a stage). "shipped" = approved and exported — the loop’s exit.

### setOptions — array

The outcome menu, replacing the old one. Each: { id, label, detail?, state?, confidence? }. Two to four options, per the suggestion rules — never a capability list.

### setOptionState — object

Flip one option: { id, state }. "picked" the moment the user chooses, "running" while you work, "produced" when it lands, "declined" when they pass on it.

### addMembers — array

Files this answer produced or is about, appended: { path, note? }. Paths are workspace-relative. Call as work lands, so the cards appear while you run.

