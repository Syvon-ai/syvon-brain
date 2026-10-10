# generate_video

COSTS REAL MONEY — QUOTE AND GET A YES FIRST. The default model (Veo 3) bills about $0.56 per second with audio: $4.48 for the default 8-second clip, half that with generateAudio: false. Before calling this, tell the user the model, the duration, whether audio is on, and the dollar total, then stop and wait for their explicit yes in a later message — unless they have said cost does not matter. Never call it twice to "try again" without a new quote. Generate a real AI video (not a designed motion graphic — that is a .comp). Use this to "make a video", "animate this image", or turn a prompt or existing image into video; it saves an .mp4 to the workspace. Three modes: text-to-video, image-to-video (imagePath/image), and first/last-frame-to-video (imagePath + endImagePath). Defaults to Veo 3 on fal; pass `model` for another fal.ai video model (the model option lists the ids). Options: aspectRatio (16:9 or 9:16), durationSeconds (default 8; Veo accepts 4, 6, or 8 — avoid 5 and 7). For image-to-video, first read imagePath's `.meta/<filename>.json` sidecar (if one exists) and fold its description/tags into the prompt — describe MOTION building on what the image actually shows, not a generic prompt reused across images.

## Parameters

### prompt — string (required)

Text description of the video to generate.

### path — string (required)

Workspace-relative path where the video file will be saved (e.g. Library/video.mp4).

### aspectRatio — string

Aspect ratio. Defaults to 16:9 when omitted — pass "9:16" explicitly for portrait; it is not guessed from the source image.

### durationSeconds — number

Duration in seconds (default 8). Each model makes only its own lengths — see the `model` option — and an off-grid value is snapped to the nearest one it makes (a tie goes to the longer). The bill follows the clip length actually made.

### imagePath — string

Workspace-relative path to an image file to use as the starting frame for image-to-video generation (e.g. Library/cat.png). Preferred over raw base64.

### image — string

Optional base64-encoded image for image-to-video generation. Prefer imagePath instead when the image is already in the workspace.

### endImagePath — string

Workspace-relative path to an END frame image, for first/last-frame-to-video generation (requires a fal model that supports it, e.g. "fal-ai/veo3.1/fast/first-last-frame-to-video"). Pairs with imagePath/image as the start frame.

### endImage — string

Optional base64-encoded END frame image. Prefer endImagePath instead when the image is already in the workspace.

### model — string

Model id to generate with. Omit for the default (Veo 3 on fal, "fal-ai/veo3", text-to-video). The enabled models, and what each accepts: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" (Kling 2.5 Turbo Pro — Text-to-Video (fal)): text only; 5/10s only; switches endpoint by the frames you pass | "fal-ai/kling-video/v2.5-turbo/pro/image-to-video" (Kling 2.5 Turbo Pro — Image-to-Video (fal)): start frame required, end frame optional; 5/10s only; switches endpoint by the frames you pass | "fal-ai/veo3" (Veo 3 (fal)): text, or a start frame; 4/6/8s only; generateAudio:false bills less | "fal-ai/veo3.1/fast/image-to-video" (Veo 3.1 Fast — Image-to-Video (fal)): start frame required; 4/6/8s only; generateAudio:false bills less; switches endpoint by the frames you pass | "fal-ai/veo3.1/fast/first-last-frame-to-video" (Veo 3.1 Fast — First/Last Frame (fal)): start frame required, end frame optional; 4/6/8s only; generateAudio:false bills less; switches endpoint by the frames you pass | "fal-ai/bytedance/seedance/v1.5/pro/image-to-video" (Seedance 1.5 Pro — Image/First-Last to Video (fal)): start frame required, end frame optional; 4–12s | "fal-ai/bytedance/omnihuman/v1.5" (OmniHuman 1.5 — Avatar Lipsync (fal)): portrait (imagePath) + narration audio, lip-synced; length follows the audio | "fal-ai/infinitalk" (InfiniteTalk — Avatar Lipsync (fal)): portrait (imagePath) + narration audio, lip-synced; length follows the audio | "fal-ai/kling-video/v1/standard/ai-avatar" (Kling AI Avatar (fal)): portrait (imagePath) + narration audio, lip-synced; length follows the audio | "fal-ai/kling-video/v1/pro/ai-avatar" (Kling AI Avatar Pro (fal)): portrait (imagePath) + narration audio, lip-synced; length follows the audio. A model that "switches endpoint" can be named by either id — the call is sent to the text, image or first/last endpoint that fits the frames you pass. Only the models named here are enabled: any other id is refused as FEATURE_DISABLED, so never guess or try variants of an endpoint path. Only usable when a metered lane is wired (brain connection, or a signed-in Studio session / workspace key for the cloud lane) — see the error message if it is not.

### generateAudio — boolean

Whether the model generates a soundtrack with the video. Default true. Pass false for silent footage — music or a voiceover added later, or B-roll — which roughly HALVES the price on Veo 3 ($0.28/sec instead of $0.56) and cuts Veo 3.1 Fast by a third. Models without an audio track (Kling, Seedance, the avatars) ignore it.

### jobId — string

Resume or collect a paid generation. Pass the id a previous generate_video call handed back — status "generating" (still running) or "uncollected" (finished, but the download failed, e.g. a dropped connection) — together with the same path it returned. Collecting is free and never re-bills. Never invent one, and never start a new generation while one is pending or uncollected — it is already paid for. If a call failed with SUBMIT_UNCONFIRMED, do not retry until the user says so: that generation may have started.

