/**
 * v8 workflow path helpers — mirror of `project-paths.ts`.
 *
 * Workflow content lives flat under `workflows/{slug}/` (the canonical
 * top-level segment is `WS_WORKFLOWS`, sourced from the folder registry so
 * a rename of the folder vocabulary propagates here automatically).
 *
 * These are pure, workspace-relative path builders (no `workspaces/{id}/`
 * bucket prefix). Callers that need an absolute R2 key prepend their own
 * storage prefix, exactly as they do with `getProjectFolder`.
 */
import { WS_WORKFLOWS } from '../workspace-config';

/** Get the workflow folder path (workspace-relative R2 prefix). */
export function getWorkflowFolder(slug: string): string {
  return `${WS_WORKFLOWS}/${slug}`;
}

/** Get the full workspace-relative path for a file inside a workflow. */
export function getWorkflowItemPath(slug: string, filename: string): string {
  return `${WS_WORKFLOWS}/${slug}/${filename}`;
}

/** Shop folder for a workflow's products: workflows/<slug>/shop */
export function getShopFolder(workflowSlug: string): string {
  return `${getWorkflowFolder(workflowSlug)}/shop`;
}

/** The shop manifest path: workflows/<slug>/shop/index.json */
export function getShopManifestPath(workflowSlug: string): string {
  return `${getShopFolder(workflowSlug)}/index.json`;
}

/** A single product's folder: workflows/<slug>/shop/<product> */
export function getShopProductFolder(workflowSlug: string, product: string): string {
  return `${getShopFolder(workflowSlug)}/${product}`;
}

/** A file inside a product: workflows/<slug>/shop/<product>/<file> */
export function getShopProductItemPath(workflowSlug: string, product: string, file: string): string {
  return `${getShopProductFolder(workflowSlug, product)}/${file}`;
}

/** The workflow's ENTRY graph (the compiled-for-generation flow):
 *  workflows/<slug>/<slug>.flow — reserved, reconciles into Workflow.graph. */
export function getWorkflowEntryGraphPath(slug: string): string {
  return `${getWorkflowFolder(slug)}/${slug}.flow`;
}

/** Folder holding a workflow's composable sub-flows: workflows/<slug>/flows */
export function getWorkflowSubflowsFolder(slug: string): string {
  return `${getWorkflowFolder(slug)}/flows`;
}

/** A single sub-flow: workflows/<slug>/flows/<name>.flow (`name` has no .flow suffix). */
export function getWorkflowSubflowPath(slug: string, name: string): string {
  return `${getWorkflowSubflowsFolder(slug)}/${name}.flow`;
}
