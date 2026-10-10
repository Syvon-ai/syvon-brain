# show

Put something from the workspace in front of the user — an image, a video, audio with its captions, a PDF, a Lottie or Rive animation, or a .comp poster. The right viewer is chosen from the file itself. Use whenever the user asks to SEE, WATCH or HEAR something rather than read about it; a path alone shows them nothing. Pass several paths to show them as a grid instead. Accepts png, jpg, webp, gif, mp4, webm, mov, mp3, m4a, aac, wav, ogg, pdf, riv, comp, and Lottie .json.

## Parameters

### paths — any (required)

Workspace-relative path, or several paths to show as a grid. One path opens full-size.

### title — string

Optional heading, used when showing several.

### poster — string

Video only. A still to show while it loads. One is looked for beside the video by convention, so this is only needed when it lives somewhere else.

### captions — string

Audio only. An .srt to show synced to playback. One is looked for beside the audio by convention (generate_voice writes it), so this is only needed when it lives elsewhere.

