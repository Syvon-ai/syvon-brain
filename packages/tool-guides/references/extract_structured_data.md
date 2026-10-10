# extract_structured_data

Extract structured JSON data against a schema, from text or from workspace images. Useful for parsing documentation, extracting entities, converting prose into data, or reading printed values off a scanned page, line sheet, invoice, or screenshot. Supply `text`, or `imagePaths` for vision, or both. With images it reads at high detail and is told to return null rather than guess, so a missing field means "not legible" instead of a plausible invention.

## Parameters

### text — string

The unstructured text to extract from.

### imagePaths — array

Workspace-relative paths to images to read (png/jpg/webp/gif). Several may be passed together when they describe one subject — e.g. a product photo plus its caption block.

### schema — object (required)

JSON schema defining the data to extract.

### instruction — string

Optional extra guidance for the read, e.g. "the style code is the large number in the header".

### model — string

Optional model override for the vision read.

