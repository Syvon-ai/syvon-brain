# show_video

Play a video from the workspace in the conversation — a rendered .mp4, a generated clip, any video file. Use whenever the user wants to WATCH something rather than be told where it is; a path alone shows them nothing. Accepts mp4, webm and mov, up to about 12 MB.

## Parameters

### path — string (required)

Workspace-relative path to the video file.

### posterPath — string

Optional still to show while the video loads. One is looked for beside the video by convention, so this is only needed when it lives somewhere else.

