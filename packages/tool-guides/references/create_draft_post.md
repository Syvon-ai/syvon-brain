# create_draft_post

Create a DRAFT post in the app's Posts section from a rendered image or video that already exists in this workspace, with its caption. Nothing is published: the draft waits on the Posts board for the user to review, and its `postId` is what schedule_post takes. Use this for "make a post", "draft a post", "let me review it before it goes out". Render first (render_still / render_video) — this takes a finished file, not a .dsgn or .comp. Calling it again on the same file updates that draft instead of making a second one. Not save_draft / update_draft, which keep text notes that never appear in Posts.

## Parameters

### path — string (required)

Workspace-relative path to the rendered image or video, e.g. projects/spring-launch/output/post.jpg

### caption — string

Caption text for the post.

### title — string

Optional short title shown on the Posts board.

### hashtags — array

Optional hashtags, kept beside the caption.

