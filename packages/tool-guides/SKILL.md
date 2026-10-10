---
name: syvon-tool-guides
description: |
  Full usage guides for every MCP tool, one file per tool. The wire's tool
  descriptions are compact one-liners; the complete text — modes, enums,
  gotchas, parameter docs — lives here and is pulled with
  `load_skill_file("syvon-tool-guides/references/<tool_name>.md")` right
  before a tool is called. Not a persona: never set_skill into, only read
  from. Regenerate with
  `npx tsx packages/agent/scripts/generate-tool-guides.mts`.
---

Load a tool's guide file with `load_skill_file` when you are about to call a
tool whose wire description ends with a guide pointer and you need the full
semantics — the parameter tables, the mode lists, the failure modes. The file
for tool `render_sequence` is `syvon-tool-guides/references/render_sequence.md`.
Call `load_skill_file("*")` to list every available path.
