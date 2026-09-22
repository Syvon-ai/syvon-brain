# Source provenance

Initial extraction: 2026-09-21. Source revision: 30249a7181945df2c123e15756c77751226652b8.

Only tracked files under packages/organism/src and packages/tool-library/src were copied. No private repository history, workspace content, credentials, app configuration, or uncommitted Brain UI changes were copied. Packaging, CI, examples and documentation are specific to this standalone release.

The original package names are retained for compatibility. The public project name is Syvon Brain. These packages are built locally; this release does not imply npm registry publication.

The spatial Brain UI and workspace-sync integrity engine remain integration work: the UI depends on studio-editor, studio-ui and ui; the integrity engine depends on private FormatKit parsers, agent reference utilities, sync resolution and template hydration. The hosted service named services/brain is a separate execution gateway, outside this release.

The Google Fonts catalog contains font metadata, not font binaries. Upstream font licenses apply separately to any fonts downloaded by a consuming app.

The cross-package archetype test that scans the private agent implementation registry is not runnable here. Its standalone audience-subset assertion is retained; registry closure remains a host integration check. The standalone test toolchain is updated separately from the private monorepo.
