# describe_image

Generate metadata (description + tags) for a workspace image using AI vision. Writes a .meta/ sidecar with label, description, and semantic tags. Use this when an image has no metadata or needs updated metadata.

## Parameters

### path — string (required)

Workspace-relative path to the image (e.g. "projects/my-project/photo.png").

