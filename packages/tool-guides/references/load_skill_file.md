# load_skill_file

Load the verbatim content of a skill reference file (e.g. "syvon/process.md", "syvon-formatkit/files/dsgn.md"). Use when a skill lists a file under "Skill files (not loaded)" and you need its full content to proceed — for example, before authoring a motion comp load "syvon/composition-types/motion.md". Paths must match the skill listing exactly. To discover available paths, look at the skill listing in the system prompt or call with the special path "*" to list all loadable paths grouped by skill.

## Parameters

### path — string (required)

Virtual skill-file path as shown in the skill listing (e.g. "syvon/process.md"). Pass "*" to list all available skill-file paths.

