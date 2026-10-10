# create_json_from_schema

Create a JSON file validated against a JSON Schema. Provide the schema (inline or by path) and the data. The tool validates the data against the schema before writing. Use for creating schema instances, config files, or any structured JSON.

## Parameters

### path — string (required)

Output path for the JSON file.

### data — any (required)

The JSON data to validate and write.

### schemaPath — string

Path to a JSON Schema file in the workspace (reads and validates against it).

### schema — object

Inline JSON Schema (used if schemaPath is not provided).

