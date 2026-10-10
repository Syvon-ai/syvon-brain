# list_flows

List the runnable flows (.flow) in the workspace, with what each one makes and which inputs it requires. With workflowSlug (defaults to the active workflow), lists that workflow's entry graph and any sub-flows; without one, lists standalone flows plus every installed Flow by slug. Pass request (what you want to make) to get them ranked by fit, with any required inputs your request does not supply named per flow. Returns refs you can pass straight to run_flow.

## Parameters

### workflowSlug — string

Workflow slug whose flows to list. Defaults to the active workflow; pass an empty string to list the whole workspace.

### request — string

What you want to make, in the user's words. Ranks the flows by fit and names the required inputs your request does not supply.

