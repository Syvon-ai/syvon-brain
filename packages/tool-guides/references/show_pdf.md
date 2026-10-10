# show_pdf

Show a PDF from the workspace in the conversation — a rendered line-sheet, an exported deck, any .pdf file. Use whenever the user wants to SEE or download a PDF rather than be told where it is. Renders the pages inline (you can page through them) with a download button. Up to about 2 MB; for a larger file, hand over a link with get_download_url instead.

## Parameters

### path — string (required)

Workspace-relative path to the .pdf file.

