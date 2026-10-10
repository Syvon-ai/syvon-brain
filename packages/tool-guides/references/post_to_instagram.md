# post_to_instagram

Publish a rendered file from this workspace to the workspace's connected Instagram account. The file must ALREADY EXIST as a render (an image or video in projects/{slug}/output/ or assets/) — this posts a finished artifact, it does not render one, so call render_still / render_sequence / export_design first. Instagram requires a Business or Creator account and a publicly reachable media URL, both of which the portal arranges. This is a REAL, IRREVERSIBLE publish to a live account, and it is DOUBLE-LOCKED: the call is refused unless `confirm` carries the publish passphrase, a secret the workspace owner set on the server and that only they know. You do not have it and must never guess it, derive it, or reuse one from an earlier turn. Show the user the file, the caption and the target account (list_social_connections), then ask them to type the passphrase; call this only with the exact text they typed in reply. For the in-product feed instead, use publish_feed — that is a sidecar, not a post.

## Parameters

### path — string (required)

Workspace-relative path to the rendered image or video, e.g. projects/spring-launch/output/post.jpg

### caption — string

Caption text, hashtags included. Instagram caps this at 2,200 characters.

### confirm — string (required)

The publish passphrase, exactly as the user typed it in THIS conversation after you showed them what will be posted. Never fill this in on your own — if the user has not typed it, ask and stop.

### media — array

Optional: 2-10 workspace-relative paths to publish as ONE carousel. When given, `path` is the cover and must also appear here. Instagram rejects a carousel outside that range.


### postId — string

When this publishes a draft from the Posts board, that draft's postId (from create_draft_post). Pass it whenever one exists — even if the file posted differs from the draft's (e.g. an Instagram-sized render) — so the board moves that draft to Published. Omitted, the post is matched by path or recorded as a new Post.
