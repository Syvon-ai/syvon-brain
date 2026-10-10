# show_audio

Play an audio file from the workspace in the conversation — a generated voiceover (.mp3), a music bed, any audio file — with its captions if a matching .srt exists beside it. Use whenever the user wants to HEAR something (or read along) rather than be told where it is; a path alone plays nothing. Accepts mp3, m4a, aac, wav, ogg, up to about 2 MB.

## Parameters

### path — string (required)

Workspace-relative path to the audio file.

### srtPath — string

Optional captions (.srt) to show synced to playback. One is looked for beside the audio by convention (e.g. generate_voice writes it), so this is only needed when it lives elsewhere.

