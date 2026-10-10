# manage_plan

Create and manage a step-by-step plan. Use at the start of complex tasks to break them into steps, then update each step as you work.

## Parameters

### action — string (required)

Action to perform on the plan.

### steps — array

List of step titles. Required when action is "create".

### step_id — number

Step ID to update. Required when action is "update".

### status — string

New status for the step. Required when action is "update".

### notes — string

Optional note to attach when updating a step.

