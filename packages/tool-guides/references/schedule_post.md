# schedule_post

Schedule a Post for future publishing. If `scheduledAt` is provided, commits that timestamp. Otherwise fetches 3 suggestions and picks one matching `runWindow` (or the first suggestion when omitted).

## Parameters

### postId — string (required)

The `Post.id` to schedule.

### scheduledAt — string

ISO-8601 timestamp to commit. When present, skips the suggest step.

### runWindow — string

Rough daypart for auto-pick. Used when `scheduledAt` is omitted.

