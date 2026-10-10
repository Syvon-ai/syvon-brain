# preview_file

Build a self-contained HTML preview of a workspace file (JSON pretty-printed and coloured, or source shown as-is) and return it as `data.html`. DISPLAY THE RESULT: create an HTML artifact containing `data.html` verbatim so the user can see it. Use for inspecting config, tokens, .dsgn/.comp source, or any JSON in the workspace.

## Parameters

### path — string (required)

Workspace-relative path to the file to preview.

