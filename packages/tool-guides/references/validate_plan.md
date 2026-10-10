# validate_plan

Validate a _plan.json file against structural rules. Checks: required content is assigned to pages, slot assignments reference valid content keys, format names exist in the catalog, duration is in range, no duplicate page names.

## Parameters

### path — string (required)

Workspace-relative path to the _plan.json file.

