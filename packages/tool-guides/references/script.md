# script

Run one of the workspace's occasional operations — the things you need rarely and that stand on their own. Call it with `name` alone to see what arguments that operation takes, then again with `args` to run it. Available: get_generation_settings: read a Flow's generation defaults — which formats, voice, captions and pacing it offers; update_generation_settings: change a Flow's generation defaults, including which knobs it offers at all.

## Parameters

### name — string (required)

Which operation to run.

### args — object

That operation's arguments. Omit entirely to be told what it takes instead of running it.

