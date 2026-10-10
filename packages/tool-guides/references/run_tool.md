# run_tool

Run one of this workspace's custom tools — a `.tool` file in tools/. Call list_tools first to see what exists and what arguments each takes. The script runs sandboxed: it can only call the tools its own header allows, and each of those calls is checked exactly as your own call to that tool would be.

## Parameters

### name — string (required)

The tool's name exactly as list_tools reports it — e.g. text_mask_image, or payroll/report for one that lives in a slug folder.

### args — object

Arguments for the tool, matching the params schema list_tools reports.

