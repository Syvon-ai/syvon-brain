# inspect_template

Inspect a template file (Lottie, Rive, Design, or video) and return slot metadata, dimensions, fps, and duration. For Lottie (.lottie, .json), Design (.dsgn, .design), and Rive (.riv) returns extractable slots when available; for video (.mp4, .webm, etc.) returns a placeholder with no slots. Optionally merges a .tmpl.json sidecar when present.

## Parameters

### path — string (required)

Path to the template file relative to workspace root (e.g. "projects/my-project/hero.lottie", "projects/my-project/intro.mp4", or relative ./path).

