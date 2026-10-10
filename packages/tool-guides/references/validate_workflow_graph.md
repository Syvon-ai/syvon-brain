# validate_workflow_graph

Validate a workflow node-graph (WorkflowGraphDoc JSON) against the v1 schema. Returns ok/errors/warnings plus a summary (node + edge counts, and whether a terminal result node is present so brain can run it). Use right after authoring a graph with the workflow-codegen skill and before saving it. Pass the graph inline via `graph`, or a workspace-relative JSON file path via `path`. Passing `path` for a flow's `<slug>.flow` ALSO checks that its file nodes point at files that exist — push silently drops the ones that do not, and a flow whose selection nets zero falls back to using every exemplar.

## Parameters

### graph — object

The WorkflowGraphDoc JSON to validate (inline).

### path — string

Workspace-relative path to a JSON file holding the graph (alternative to `graph`).

