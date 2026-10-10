# apply_diff

Apply targeted edits to an existing file via unified diff. On desktop the user reviews before apply; on cloud the diff is applied directly. Use when modifying part of a file. For new files or full replacement use write_file.

## Parameters

### path — string (required)

The path to the file to modify.

### diff — string (required)

The changes to apply, as a unified diff with @@ hunk headers. Write the file content EXACTLY as it appears in the file: do not escape quotes (`attr="v"`, never `attr=\"v\"`), and give every blank context line its single leading space. Build the context lines from a fresh read, not from memory. The @@ line counts are checked against the body and corrected when they disagree, so getting them slightly wrong is survivable — getting the CONTENT wrong is not.

