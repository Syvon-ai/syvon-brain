# check_contrast

Check text-on-surface contrast across MANY pages and MANY brands at once, and report which token pairings fail in which brands. Use this for templates/ and for any folder of .dsgn pages — a template carries no brand, so it is readable or not depending on which brand hydrates it, and `validate` (one file, one brand) cannot see that. Results group by PAIRING (e.g. var(--color-primary) on var(--color-surface)) and name the brands it fails in: failing in EVERY brand means the pairing itself is wrong; failing in SOME means the page was authored against one palette and shipped to the rest. Colour modes are honoured — each Text is resolved in the mode it actually paints in, so a page that is fine in the base palette and unreadable in `light` is reported as the second. Read-only and advisory: it never fails a file, and it only speaks up below 3:1, where no reading of the page is comfortable. Run it before reworking a template set, and again after, to see what moved.

## Parameters

### path — string

Workspace-relative file or folder to check. A folder is walked for .dsgn pages. Defaults to `templates`.

### brands — array

Brand slugs to check against, as they appear under `brands/`. Use `default` for the workspace's own tokens. Omit to check against every brand the workspace has — which is the point of the tool.

### limit — number

Maximum pairings to return, worst first (default 30). The counts in the summary are always complete.

