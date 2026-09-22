import { describe, it, expect } from 'vitest';
import { getWorkflowFolder, getWorkflowItemPath, getShopFolder, getShopManifestPath, getShopProductFolder, getShopProductItemPath, getWorkflowEntryGraphPath, getWorkflowSubflowsFolder, getWorkflowSubflowPath } from '../dna/workflow-paths';
import { getProjectFolder, getProjectItemPath, getProjectContextPath } from '../dna/project-paths';
import { WS_WORKFLOWS, WS_WORK } from '../workspace-config';

describe('workflow-paths', () => {
  it('getWorkflowFolder builds workflows/{slug}', () => {
    expect(getWorkflowFolder('onboarding')).toBe('workflows/onboarding');
  });
  it('getWorkflowItemPath builds workflows/{slug}/{file}', () => {
    expect(getWorkflowItemPath('onboarding', 'graph.json')).toBe('workflows/onboarding/graph.json');
  });
  it('derives the top segment from the WS_WORKFLOWS registry constant', () => {
    expect(getWorkflowFolder('x').startsWith(`${WS_WORKFLOWS}/`)).toBe(true);
  });
});

describe('shop paths', () => {
  it('getShopFolder builds workflows/{slug}/shop', () => {
    expect(getShopFolder('demo')).toBe('workflows/demo/shop');
  });
  it('getShopManifestPath builds workflows/{slug}/shop/index.json', () => {
    expect(getShopManifestPath('demo')).toBe('workflows/demo/shop/index.json');
  });
  it('getShopProductFolder builds workflows/{slug}/shop/{product}', () => {
    expect(getShopProductFolder('demo', 'pack')).toBe('workflows/demo/shop/pack');
  });
  it('getShopProductItemPath builds workflows/{slug}/shop/{product}/{file}', () => {
    expect(getShopProductItemPath('demo', 'pack', 'meta.json')).toBe('workflows/demo/shop/pack/meta.json');
  });
});

describe('project-paths (single-source regression)', () => {
  it('getProjectFolder builds projects/{slug}', () => {
    expect(getProjectFolder('deck')).toBe('projects/deck');
  });
  it('getProjectItemPath builds projects/{slug}/{file}', () => {
    expect(getProjectItemPath('deck', 'cover.dsgn')).toBe('projects/deck/cover.dsgn');
  });
  it('getProjectContextPath builds projects/{slug}/.context.jsonl', () => {
    expect(getProjectContextPath('deck')).toBe('projects/deck/.context.jsonl');
  });
  it('derives the top segment from the WS_WORK registry constant', () => {
    expect(getProjectFolder('x').startsWith(`${WS_WORK}/`)).toBe(true);
  });
});

describe('workflow-paths — nested .flow layout (SOT model A)', () => {
  it('getWorkflowEntryGraphPath builds workflows/{slug}/{slug}.flow', () => {
    expect(getWorkflowEntryGraphPath('onboarding')).toBe('workflows/onboarding/onboarding.flow');
  });
  it('getWorkflowSubflowsFolder builds workflows/{slug}/flows', () => {
    expect(getWorkflowSubflowsFolder('onboarding')).toBe('workflows/onboarding/flows');
  });
  it('getWorkflowSubflowPath builds workflows/{slug}/flows/{name}.flow', () => {
    expect(getWorkflowSubflowPath('onboarding', 'enrich')).toBe('workflows/onboarding/flows/enrich.flow');
  });
  it('derives the top segment from the WS_WORKFLOWS registry constant', () => {
    expect(getWorkflowEntryGraphPath('x').startsWith(`${WS_WORKFLOWS}/`)).toBe(true);
  });
});
