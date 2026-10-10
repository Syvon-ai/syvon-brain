# write_spreadsheet

Write a real .xlsx workbook — one or more sheets of typed cells, with an optional bold header row, column widths and per-column number formats. Reach for this whenever a person is going to OPEN the result in Excel, Numbers or Sheets: an accounting report, a payroll summary, a line sheet as data, an export someone will filter and total. Numbers stay numbers, so the totals row a reader adds actually works — which is the whole reason not to hand them a CSV renamed .xlsx. For machine-readable source data that another tool will parse, prefer write_file with a .csv: that is the format to aggregate from, and this is the format to report in.

## Parameters

### path — string (required)

Workspace-relative output path ending in .xlsx, e.g. admin/accounts/2026/08/accounting.xlsx.

### sheets — array (required)

One entry per sheet, in tab order.

### sheets[].name — string

Tab name. Over 31 characters or carrying \ / ? * [ ] : it is repaired, not refused.

### sheets[].columns — array

Optional per-column spec, positional. Any column carrying a `header` gives the sheet a bold header row above the data.

### sheets[].columns[].header — string

Header cell text for this column.

### sheets[].columns[].width — number

Column width in characters.

### sheets[].columns[].numberFormat — string

Excel format applied to NUMERIC cells in this column, e.g. "#,##0.00" for money, "0.00%" for a rate, "yyyy-mm-dd" for a serial date. Display only — it never changes the stored value, and it is ignored on text cells.

### sheets[].rows — array (required)

Data rows, each an array of cells. A cell may be a string, a number, a boolean or null (empty). Write money and hours as NUMBERS, never as pre-formatted strings.

