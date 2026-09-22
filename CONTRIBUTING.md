# Contributing

Use Node.js 22.12 or newer. Run npm ci, npm run type-check, npm test and npm run example before opening a pull request.

Keep storage and model providers injectable. Preserve existing path and data contracts unless a change includes migration guidance. Add behavioral tests for changed semantics, especially permissions, approvals and migrations. Use synthetic fixtures; never include customer workspaces, secrets or private assets.

The roadmap describes proposed capabilities. Discuss substantial additions in a GitHub issue before implementing them. Explain the problem, behavior change and validation in your pull request.

Contributions are provided under the project's MIT license.
