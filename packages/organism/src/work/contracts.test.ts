import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { brainWorkScopePath, brainScopeGrantPath, brainDreamReceiptPath, BRAIN_OUTCOMES_FILE, parseBrainWorkScope, parseBrainScopeGrant, parseBrainOutcomeObservation, parseBrainDreamReceipt, serializeBrainWorkScope, type BrainWorkScope, type BrainDreamReceipt, type BrainOutcomeObservation, type BrainScopeGrant } from './contracts';
const hash = 'a'.repeat(64);
const ref = {id:'launch',revision:1,sha256:hash};
const at = '2026-09-21T12:00:00.000Z';
function scope(): BrainWorkScope { return {
  schema:'brain-work-scope/v1',id:'launch',revision:1,project:'Product Launch',intent:'Explain the release using approved facts.',
  inputs:[{source:{path:'content/release.md',sha256:hash},purpose:'Product facts'}],
  outcomes:[{id:'current',description:'Communication matches the release',evidenceRequired:'A reviewed comparison against release notes'}],
  deliverables:[{path:'projects/Product Launch/launch.comp',outcomeIds:['current']}],constraints:['Drafts only'],
  continuation:{mode:'finish',maxRuns:2,maxRefinementPasses:2},
}; }
function grant(): BrainScopeGrant { return {schema:'brain-scope-grant/v1',id:'grant-1',scope:ref,by:'person-1',at,expiresAt:'2026-09-22T12:00:00.000Z',state:'approved',budget:{maxCostUnits:10,costUnit:'credits'}}; }
function outcome(): BrainOutcomeObservation { return {schema:'brain-outcome/v1',id:'observation-1',scope:ref,outcomeId:'current',status:'unmeasured',evidence:[],observedBy:'person-1',observedAt:at,note:'Export exists; review is pending.'}; }
function receipt(): BrainDreamReceipt { return {schema:'brain-dream-receipt/v1',id:'run-1',scope:ref,grantId:'grant-1',sessionId:'session-1',status:'idle',reason:'No source changed.',startedAt:at,finishedAt:at,inputs:[],outputs:[],cardIds:[],revisionIds:[],outcomeObservationIds:[],usage:{runs:1,refinementPasses:0,costUnits:0,costUnit:'credits'}}; }

describe('portable work contracts',()=>{
  it('round trips a scope without renaming existing project or content paths',()=>{
    const original=scope();const result=parseBrainWorkScope(serializeBrainWorkScope(original));
    expect(result).toEqual({ok:true,value:original});
    expect(brainWorkScopePath(original.project)).toBe('projects/Product Launch/scope.json');
    expect(brainScopeGrantPath('grant-1')).toBe('meta/scope-grants/grant-1.json');
    expect(brainDreamReceiptPath('run-1')).toBe('meta/dream-runs/run-1.json');
    expect(BRAIN_OUTCOMES_FILE).toBe('meta/outcomes.jsonl');
  });
  it('distinguishes malformed or future data from an empty scope',()=>{
    for(const raw of ['{',null,{}, {...scope(),schema:'brain-work-scope/v2'}]) expect(parseBrainWorkScope(raw).ok).toBe(false);
  });
  it.each(['../escape','/absolute','C:/secret','a//b','a/../b','a/./b','a/%2e%2e/b','https://example.com/a','a/*','a/CON','a/ends.','a\\b'])('rejects nonportable source %s',path=>{
    const v=scope();v.inputs[0].source.path=path;expect(parseBrainWorkScope(v).ok).toBe(false);
  });
  it('rejects outputs outside the exact project and the scope itself',()=>{
    for(const path of ['projects/Product Launch Other/a.comp','projects/other/a.comp','projects/Product Launch/scope.json']) {
      const v=scope();v.deliverables[0].path=path;expect(parseBrainWorkScope(v).ok).toBe(false);
    }
  });
  it('rejects dangling outcome links and duplicate desired outcomes',()=>{
    const v=scope();v.deliverables[0].outcomeIds=['missing'];expect(parseBrainWorkScope(v).ok).toBe(false);
    const dup=scope();dup.outcomes.push({...dup.outcomes[0]});expect(parseBrainWorkScope(dup).ok).toBe(false);
  });
  it('does not reinterpret unknown authority or recurring fields',()=>{
    expect(parseBrainWorkScope({...scope(),publish:true}).ok).toBe(false);
    expect(parseBrainWorkScope({...scope(),continuation:{...scope().continuation,mode:'weekly'}}).ok).toBe(false);
    expect(parseBrainWorkScope({...scope(),continuation:{...scope().continuation,maxRuns:Infinity}}).ok).toBe(false);
    expect(parseBrainWorkScope({...scope(),continuation:{...scope().continuation,maxRuns:0}}).ok).toBe(false);
  });
  it('canonicalizes object keys and changes the approval digest when scope changes',()=>{
    const v=scope();const reordered=Object.fromEntries(Object.entries(v).reverse()) as unknown as BrainWorkScope;
    expect(serializeBrainWorkScope(v)).toBe(serializeBrainWorkScope(reordered));
    const digest=(s:BrainWorkScope)=>createHash('sha256').update(serializeBrainWorkScope(s),'utf8').digest('hex');
    const before=digest(v);v.continuation.maxRuns++;expect(digest(v)).not.toBe(before);
  });
  it('requires a bounded grant tied to a pinned scope; paused and revoked remain explicit',()=>{
    for(const state of ['approved','paused','revoked'] as const) expect(parseBrainScopeGrant({...grant(),state}).ok).toBe(true);
    expect(parseBrainScopeGrant({...grant(),scope:{id:'launch',revision:1}}).ok).toBe(false);
    expect(parseBrainScopeGrant({...grant(),expiresAt:at}).ok).toBe(false);
    expect(parseBrainScopeGrant({...grant(),budget:{maxCostUnits:-1,costUnit:'credits'}}).ok).toBe(false);
  });
  it('rejects impossible dates instead of normalizing them into a grant',()=>{
    expect(parseBrainScopeGrant({...grant(),at:'2026-02-30T12:00:00.000Z'}).ok).toBe(false);
  });
  it('does not equate a deliverable with a measured outcome',()=>{
    const v=outcome();expect(parseBrainOutcomeObservation(v).ok).toBe(true);
    v.status='met';expect(parseBrainOutcomeObservation(v).ok).toBe(false);
    v.evidence=[{path:'projects/Product Launch/launch.comp'}];expect(parseBrainOutcomeObservation(v).ok).toBe(false);
    v.evidence=[{path:'content/review.md',revisionId:'revision-1'}];expect(parseBrainOutcomeObservation(v).ok).toBe(true);
  });
  it('permits no-op receipts and blocked work without fabricating progress',()=>{
    expect(parseBrainDreamReceipt(receipt()).ok).toBe(true);
    for(const status of ['blocked','needs-review','failed'] as const) expect(parseBrainDreamReceipt({...receipt(),status}).ok).toBe(true);
    expect(parseBrainDreamReceipt({...receipt(),status:'progressed'}).ok).toBe(false);
    expect(parseBrainDreamReceipt({...receipt(),outputs:[{path:'projects/Product Launch/launch.comp'}]}).ok).toBe(false);
  });
  it('links progress to existing revision and review records',()=>{
    const v={...receipt(),status:'progressed',revisionIds:['revision-2'],cardIds:['card-1']};
    expect(parseBrainDreamReceipt(JSON.stringify(v))).toEqual({ok:true,value:v});
    expect(parseBrainDreamReceipt({...v,finishedAt:'2026-09-20T12:00:00.000Z'}).ok).toBe(false);
  });
  it('guards path helpers themselves against traversal',()=>{
    expect(()=>brainWorkScopePath('../other')).toThrow();
    expect(()=>brainDreamReceiptPath('../other')).toThrow();
    expect(()=>brainScopeGrantPath('/other')).toThrow();
  });
});
