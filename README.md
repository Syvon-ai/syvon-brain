# Syvon Brain

The open-source workspace organism from [Syvon](https://github.com/Syvon-ai): a TypeScript foundation for structured, brand-aware agent workspaces.

Brain gives files a shared structure, carries brand DNA, describes agent permissions and tool access, records approvals and revisions, and collects feedback signals. Storage is supplied by the host through callbacks.

**Initial release:** the organism core and declarative tool library. This is a library, not a hosted agent or a standalone visual app. Semantic retrieval, automatic learning and the spatial Brain UI are not included yet. See the [intelligence roadmap](docs/ROADMAP.md) and [extraction scope](docs/EXTRACTION.md).

## Quick start

Requires Node.js 22.12 or newer and npm.

~~~sh
git clone https://github.com/Syvon-ai/syvon-brain.git
cd syvon-brain
npm ci
npm test
npm run type-check
npm run example
~~~

The example builds both packages and demonstrates project path resolution and feedback collection in memory. It needs no API key, account, database or paid model.

## What is inside

| Package | Responsibilities |
| --- | --- |
| @syvon/organism | Workspace structure and paths; brand DNA and design tokens; folder initialization and migration; agent and MCP declarations; permissions and audience rules; approvals; cards and revisions; signals |
| @syvon/tool-library | Declarative tool-package catalog used to resolve agent capabilities; no tool execution |

The existing package names are retained for compatibility. Build artifacts are ESM with TypeScript declarations. No npm registry release has been made.

~~~js
import { ensureProjectFolder, collectSignal } from '@syvon/organism';

const file = ensureProjectFolder('launch.comp', 'demo');
// projects/demo/launch.comp

// readFile/writeFile are supplied by your storage adapter.
await collectSignal(readFile, writeFile, 'signals.json', {
  type: 'approve',
  context: file,
  timestamp: new Date().toISOString(),
});
~~~

See [examples/workspace.mjs](examples/workspace.mjs) for a complete runnable adapter.

## Integration contract

The host owns authentication, authorization, storage isolation and tool execution. Path helpers and permission declarations do not enforce an operating-system sandbox. Validate paths and access in storage adapters before touching a filesystem or object store.

Signal writes serialize within one JavaScript process. Multiple workers need transactional storage or a shared queue. The current collector stores aggregate counts, not a durable event log. DNA reads can return null for missing, invalid or unreadable content; integrations needing error distinctions should handle them in their adapter.

Some exports perform optional remote fetches for font metadata or ingestion. The core example and tests need no remote service. Font catalogs contain metadata, not bundled fonts.

## Development

~~~sh
npm ci
npm run type-check
npm test
npm run build
~~~

CI runs the same checks and the built-package example. Contributions are welcome; start with [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues using [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Copyright 2026 Syvon.
