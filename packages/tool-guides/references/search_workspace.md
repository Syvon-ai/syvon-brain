# search_workspace

Search for a regex pattern across workspace files; returns matching lines with paths, line numbers and a slice of the matching line as `context`. Use when you need to find where something appears or which files mention a term. Matching is PER LINE — a multi-line regex (e.g. `label:[\s\S]{0,1800}`) will NOT span lines and returns nothing; `contextChars` widens the slice WITHIN one matching line, not a multi-line window. To read a file's full source (a component to copy, a design body), use read_file or read_react, not a spanning regex. The default context is 120 chars from the line start — raise contextChars when you need the copy AROUND a hit (e.g. a design slot's current text).

## Parameters

### pattern — string (required)

The regex pattern to search for. At most 200 characters — a long alternation of candidate spellings will be REFUSED, so search for one thing at a time rather than stacking guesses into one pattern.

### filePattern — string

Optional glob to limit search (e.g., "**/*.ts").

### maxResults — number

Max results to return (default: 50).

### contextChars — number

How many characters of the matching line to return as `context` (default 120, max 2000). Raise it when a 120-char slice truncates the value you are trying to read.

