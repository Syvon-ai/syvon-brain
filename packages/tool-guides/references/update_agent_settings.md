# update_agent_settings

Change this agent's published-presentation settings (the wrap config): greeting, starter prompts, social meta, access (public/private + accept sign-in), capabilities (render/edit), live mode, and layout (variant + theme). Pass only the fields you want to change — they're deep-merged into the current settings. Read get_agent_settings first. Only works inside a project (the Canvas surface).

## Parameters

### greeting — object

Greeting on the published surface.

### starters — array

Starter prompt chips shown on the published surface (replaces the whole list).

### meta — object

Social/share metadata.

### access — object

Who can use the published agent.

### capabilities — object

What the wrapper may do with a result.

### live — object

Live / party mode.

### layout — object

How the wrapped interface is composed.

