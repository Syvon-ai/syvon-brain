# find_files

Find files by NAME or path pattern — use this to locate a file when you do not already know its directory (e.g. "*.comp", "queue*.comp", "projects/my-project/*.dsgn"). search_workspace searches file CONTENTS and will find nothing for a filename or an extension, so never conclude a file does not exist from a search_workspace result alone. Returns matching paths, most relevant first.

## Parameters

### pattern — string (required)

Name or glob. "*" matches within one path segment, "**" crosses directories. A bare extension (".comp") or bare name ("site.json") is searched everywhere.

### maxResults — number

Max paths to return (default 100).

