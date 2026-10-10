# query_skill

Load one or more Skill (.skill) files (or builtin skill IDs), build a skill-augmented system prompt, and run a single LLM completion (no tools). Returns the answer. Use for parallel Q&A or metacognition: call with different skills or questions to get multiple perspectives, then synthesize.

## Parameters

### skillPaths — array (required)

One or more .skill paths (workspace-relative) or builtin IDs (e.g. __builtin__/...).

### question — string (required)

The question to ask the skill(s).

### variables — object

Optional {{key}} substitution values for skill prompt content.

### responseFormat — string

Response format (default: text).

### maxTokens — number

Max tokens for the response (default: 2048).

### model — string

Optional model override (llmComplete uses default when omitted).

