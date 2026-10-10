# get_generation_settings

Read a Flow's generation DEFAULTS — workflows/{slug}/config.json#editing (tier 2). Returns `explicit` (what the file actually sets), `resolved` (explicit merged over the runtime DEFAULT_EDITING — what a generation with no per-request overrides will actually use), `inherited` (keys falling back to that default) and `unmanaged` (keys the file sets that this tool cannot patch, e.g. the nested `timing` block — edit those in the file). Also returns `exposure`: which per-generation knobs the Flow lets a user change at all (config.json#settings — `authored` is what the file declares, `effective` is what applies, synthesized from editing when the file declares nothing). Read this before update_generation_settings. NOT the same as get_agent_settings, which is the published wrapper config (greeting/SEO/access).

## Parameters

### workflowSlug — string

Flow to read. Defaults to the Flow in scope; use list_flows to find one.

