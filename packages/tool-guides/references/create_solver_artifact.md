# create_solver_artifact

Create a Solver artifact (.slvr or .skill) with format-aware serialization. For .slvr: provide skillPaths, optional variables (frontmatter), and prompt. For .skill: provide files array and prompt.

## Parameters

### path — string (required)

Output path (must end in .slvr or .skill).

### artifactType — string (required)

Type of artifact to create.

### skillPaths — array

Relative paths to skill files (solver only).

### variables — object

Variable definitions for toolbar (solver only). Keys are {{key}} names in the prompt.

### prompt — string

Prompt body (solver or skill). Supports {{key}} variables for solver.

### files — array

Context files with descriptions (ghost only).

### files[].path — string (required)

_no description_

### files[].description — string

_no description_

