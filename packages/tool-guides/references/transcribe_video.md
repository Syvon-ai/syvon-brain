# transcribe_video

Transcribe the spoken voice in a workspace video into SRT subtitles (with timestamps). Extracts the audio via the render service and runs OpenAI Whisper, then saves a .srt file next to the video. Use it to caption a talking-head clip or pull a transcript from an uploaded video. Costs credits ($0.006/min of audio). Input: the workspace-relative path of a video (.mp4/.mov/.webm).

## Parameters

### path — string (required)

Workspace-relative path of the source video (e.g. projects/my-project/intro.mp4 or assets/video/clip.mp4). A .srt file with the same base name is written next to it.

