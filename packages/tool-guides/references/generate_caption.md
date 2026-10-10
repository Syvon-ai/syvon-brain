# generate_caption

Generate a social-media caption (and 3–6 hashtags) for an existing Post. Persists the result on the Post row. Use on delivery surfaces after the user has selected (or the agent has identified) a specific postId.

## Parameters

### postId — string (required)

The `Post.id` to caption. Required.

### platform — string

Target platform. Defaults to the Post's own `channel` when omitted.

### tone — string

Optional tone hint (e.g. "playful", "authoritative"). Layered on top of the workspace brand voice.

