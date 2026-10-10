# generate_image

COSTS MONEY — about $0.19 per image on the default model (Nano Banana $0.06, Nano Banana Pro $0.21), times the number of images. Quote the count and dollar total and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Never re-generate on your own. Generate a RASTER (pixel) AI image with GPT Image 2 — a flat PNG, NOT editable, parametric, or animatable. When the user asks to "recreate" a pattern, graphic, or motif as something they can tweak, drive with props, or animate, build a .react component with write_file instead; reach for generate_image for photographic or illustrative raster content. Text-to-image and image-to-image (pass referenceImagePaths to edit or restyle existing workspace images). Saves to the workspace; when the active project has a brand, it lands in that brand's assets folder so every project on the brand can reuse it.

## Parameters

### prompt — string (required)

Text description of the image to generate.

### path — string (required)

Workspace-relative path where the image will be saved. Prefer brand-kit paths (e.g. assets/imagery/hero-bg.png) so the image is reusable across every project in the workspace — a bare projects/my-project/hero-bg.png is auto-redirected there when a brand is pinned. To keep an image INSIDE its project (production art: storyboard stills, per-shot frames), file it in a subfolder — projects/my-project/stills/shot-01.png is taken literally and stays put.

### aspectRatio — string

Shape of the generated image. Omit for the provider default, which is SQUARE — a portrait or landscape frame described only in the prompt comes back square with the real content letterboxed between mirrored blur bars. Pass this whenever the frame has a target shape (4:5 and 9:16 are the paid-social sizes).

### usePro — boolean

Use Nano Banana Pro (gemini-3-pro-image-preview) for higher quality. Default is false (standard Nano Banana).

### referenceImagePath — string

DEPRECATED — use referenceImagePaths instead. Workspace-relative path to a single existing image to use as a reference. Kept for back-compat.

### referenceImagePaths — array

Up to 2 workspace-relative paths to existing images to use as references (e.g. ["projects/my-project/cat.png", "projects/my-project/style.png"]). The prompt describes what to do with them. Enables image-to-image generation. Each ref is copied locally as `{stem}.ref-{i}.png` next to the output for stability.

### model — string

Image model id to use for this one call, overriding the workspace default (e.g. "fal-ai/gpt-image-2", "fal-ai/nano-banana", "fal-ai/flux/dev"). Must be a fal model. Omit for the default, which is GPT Image 2 — pass this only when a specific picture needs a specific model.

