# Initial release verification

Verified locally on Node.js 22.23.2:

- TypeScript: passed.
- Vitest: 52 files, 858 tests passed.
- ESM bundles and declaration builds: passed for both packages.
- Built-package in-memory example: passed.
- npm audit: zero reported vulnerabilities at verification time.
- Source allowlist and credential-pattern scan: reviewed before publication. This is not a formal security audit.

The app UI and private agent-registry integration are outside this release. See EXTRACTION.md.

# Portable work-contracts update

- Original organism: 52 test files, 878 tests passed, including private registry checks.
- Public core and tool library: 53 test files, 882 tests passed.
- 24 new contract cases cover portable paths, outcome references, source evidence, malformed records, canonical scope digests, grant bounds and honest idle/progress receipts.
- TypeScript, ESM/declaration builds and both built-package examples passed.
- npm audit reported zero vulnerabilities.
- Existing workspace roots and runtime integrations are unchanged. No live Dream execution is claimed.
