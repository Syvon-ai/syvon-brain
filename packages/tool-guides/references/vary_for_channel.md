# vary_for_channel

Produce a channel-native variant render of an existing Post at a new aspect ratio (e.g. 9:16 for TikTok, 4:5 for Instagram feed). Currently returns a "not yet implemented" response — the downstream pipeline is being wired. The tool call lets the user see which variant would be generated once the pipeline lands.

## Parameters

### postId — string (required)

The source `Post.id` to produce a variant from.

### targetChannel — string (required)

Destination channel for the variant.

### aspect — string (required)

Target aspect ratio. Pick the one native to the channel.

