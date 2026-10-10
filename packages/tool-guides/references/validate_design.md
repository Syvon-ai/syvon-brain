# validate_design

Validate a .dsgn (format-kit JSX) file. Checks: single <FormatCanvas> root; only layout blocks (Layout/Frame) and content (Text/Divider/Spacer/Asset) under canvas; and slot overrides on <Asset slots={{…}}> embeds match the child .dsgn's declared @slots (with Levenshtein-1 typo suggestions). Returns errors in an agent-actionable shape so the agent can self-heal via apply_diff.

## Parameters

### path — string (required)

Workspace-relative path to the .dsgn file to validate (e.g. Projects/hero/hero.dsgn).

