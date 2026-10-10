# read_file

Read file contents. Text files return their text; DOCUMENTS (.pdf, .docx, .pptx) come back as extracted TEXT, so an attached brief can be read directly; other binary files (images, fonts, archives, …) return base64 (data.encoding = "base64"), up to a size limit — over it the read is refused with the size rather than returning a download link (there is no file-out path yet). Use when you need to see what is in a file to answer, suggest changes, infer names or topics, or verify state.

## Parameters

### path — string (required)

Path relative to workspace root (e.g. "General.chat" for a file in the root). Use names from list_directory.

