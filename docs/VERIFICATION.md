# Initial release verification

Verified locally on Node.js 22.23.2:

- TypeScript: passed.
- Vitest: 52 files, 858 tests passed.
- ESM bundles and declaration builds: passed for both packages.
- Built-package in-memory example: passed.
- npm audit: zero reported vulnerabilities at verification time.
- Source allowlist and credential-pattern scan: reviewed before publication. This is not a formal security audit.

The app UI and private agent-registry integration are outside this release. See EXTRACTION.md.
