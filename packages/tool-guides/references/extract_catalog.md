# extract_catalog

COSTS MONEY — every page is read by a vision model and every product cutout is billed (about $0.03 each), so a catalog of dozens of products costs dollars. Count the pages and products first, quote the estimated total, and wait for the user's explicit yes in a later message before calling this, unless they have said cost does not matter. Extract products from a brand's scanned/exported line-sheet catalog pages. Reads each page, classifies it (product grid / cover / lifestyle / info), splits product pages into per-item cells by LAYOUT, reads each item's printed name, colour, sizes and price, and cuts each product out onto transparency. Writes index.json plus cutouts/, swatches/ and the intermediates under assets/catalogs/<catalog>/. Use when a brand has catalog page images and you need per-product data or product photography out of them. Requires an active brand. Cutouts are metered; existing ones are reused unless forceCutouts is set.

## Parameters

### catalog — string (required)

Folder name under assets/imagery/catalogs/ — e.g. "crochet-bags".

### pages — array

Optional: only these page stems (source filename without extension, e.g. ["2","8"]). Omit for the whole catalog.

### skipCutouts — boolean

Partition and read text but do not matte. Free, and the fast way to check the page split and the caption reads before spending on cutouts.

### forceCutouts — boolean

Re-matte even where a cutout already exists. Only needed when the cell geometry changed and the cached cutout covers the wrong region.

