# remove_background

COSTS MONEY — about $0.03 per image. Quote the number of images and the total and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Remove the background from an existing workspace image, producing a transparent-background PNG cutout. Use this when the user wants an object, product, or person isolated from its background — e.g. to place a product shot on a brand colour, or to build a composition from a photo. Reads an image already in the workspace and writes the cutout alongside it. This is a precise image-to-image transform, not a generative edit: it does not take a prompt and does not invent pixels. For generative changes use generate_image instead.

## Parameters

### sourcePath — string (required)

Workspace-relative path to the existing image whose background should be removed (e.g. assets/products/product-shot.jpg).

### path — string

Optional workspace-relative destination for the cutout. Must end in .png so transparency survives. Defaults to the source path with a "-cutout.png" suffix. Project-scoped paths are auto-redirected into the active brand's assets folder when a brand is pinned, matching generate_image.

