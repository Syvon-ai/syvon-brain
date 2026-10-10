# write_document

Write a real .docx — headings, paragraphs with bold/italic runs, bulleted and numbered lists, tables and page breaks, set in the brand's fonts. Reach for this whenever the reader is going to EDIT the prose: a contract, a proposal, a brief, a statement of work, a report someone will redline and send back. It is a flow document, not a layout — Word repaginates it — so it is the wrong tool for anything that has to LOOK like the brand: use export_pdf for that. For a grid of figures a reader will total use write_spreadsheet; for text another tool will parse, write_file with .md.

## Parameters

### path — string (required)

Workspace-relative output path ending in .docx, e.g. projects/acme/statement-of-work.docx.

### title — string

Document title recorded in the file properties. Not printed — add a heading block for that.

### pageSize — string

Page geometry. Defaults to A4.

### blocks — array (required)

The document, in order.

### blocks[].type — string (required)

heading | paragraph | bullets | numbers | table | pagebreak.

### blocks[].level — number

Heading level 1–3. Headings only; defaults to 1.

### blocks[].text — string

Plain text for a heading or paragraph. A newline inside it becomes a line break. Use `runs` instead when part of the line is bold or italic.

### blocks[].runs — array

A heading or paragraph as styled pieces, in order. Alternative to `text`.

### blocks[].runs[].text — string (required)

_no description_

### blocks[].runs[].bold — boolean

_no description_

### blocks[].runs[].italic — boolean

_no description_

### blocks[].items — array

List entries, for `bullets` and `numbers`. Each entry is a string, or an array of runs for mixed styling.

### blocks[].columns — array

Table header cells. Present ⇒ a bold header row with a rule under it, repeated on every page the table spans.

### blocks[].rows — array

Table body rows, each an array of cell strings.

