# hydrate_template

Create a sequence with inline shots from a template and a data file (CSV, JSON, or JSONL). Inspects the template for slots, parses the data file, auto-maps columns to slot IDs, and writes a .comp file with inline shots. Template type must be lottie, rive, design, or video.

## Parameters

### templatePath — string (required)

Path to the template file (.lottie, .riv, .dsgn).

### dataFilePath — string (required)

Path to the data file (.csv, .json, .jsonl).

### outputDir — string (required)

Directory where the sequence file will be written (e.g. Projects/my-batch). Must be inside a named project folder.

### templateType — string (required)

Kind of template: lottie, rive, design, or video.

### themePath — string

Optional path to .theme file; only used when templateType is design.

### sequencePath — string

Path for the .comp file (e.g. Projects/my-batch/my-batch.comp).

### shotDuration — number

Duration in seconds for each shot in the batch. Default 4.

### gap — number

Gap in seconds between shots. Default 0.

### maxShots — number

Maximum number of shots to create. Default 500.

