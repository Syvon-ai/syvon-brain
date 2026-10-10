# set_skill

Switch the active Skill persona for the current conversation. A builtin skill’s instructions come back in the result — adopt them immediately, for the rest of this turn; any tools the skill adds arrive on the next message. Pass one or more builtin skill IDs (e.g. __builtin__/syvon) or workspace .skill paths. Available builtins: __builtin__/brand (Brand), __builtin__/baker (Baker), __builtin__/flow-runner (Flow Runner), __builtin__/workflow-codegen (Workflow Codegen).

## Parameters

### skillIds — array (required)

Skill IDs to activate. Use __builtin__/<name> for builtins or workspace-relative .skill paths.

