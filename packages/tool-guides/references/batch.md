# batch

Run several INDEPENDENT tool calls in one go, instead of one per message. Each step is executed exactly as if you had called it yourself — same permissions, same results. Steps run in order and STOP at the first failure, so put anything that could fail first. Use it when the same work applies to several different files and no step needs a previous step's answer. Do NOT use it when a tool already takes a list (one edit_sequence with an `operations` array beats five batched calls), and do NOT use it for a step whose arguments you can only write after seeing an earlier step's result.

## Parameters

### steps — array (required)

The calls to run, in order. At most 20.

### steps[].tool — string (required)

The tool to call, e.g. "edit_design_slots".

### steps[].args — object (required)

That tool's arguments, exactly as you would pass them.

