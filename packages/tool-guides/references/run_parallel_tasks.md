# run_parallel_tasks

Spawn multiple parallel agent instances to perform similar tasks. Extremely powerful for batch operations. Each subtask runs in isolation with access to the same tools.

## Parameters

### task_prompt — string (required)

Template prompt for subtask. Use {{input}} as placeholder.

### inputs — array (required)

Array of input strings to interpolate into task_prompt.

### max_parallel — number

Max concurrent subtasks (default: 5).

