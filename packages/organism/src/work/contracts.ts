/** Portable declarations and receipts only. Parsing never authorizes execution. */
import { WS_WORK, WS_META } from '../workspace-config';

export interface BrainSourceRef {
  /** Canonical workspace-relative path; no URL, traversal or glob. */
  path: string;
  /** Missing means unpinned, never "current" or "approved". */
  sha256?: string;
  revisionId?: string;
}
export interface BrainScopeRef { id: string; revision: number; sha256: string }
export interface BrainDesiredOutcome { id: string; description: string; evidenceRequired: string }
export interface BrainWorkScope {
  schema: 'brain-work-scope/v1';
  id: string;
  revision: number;
  project: string;
  intent: string;
  inputs: { source: BrainSourceRef; purpose: string }[];
  outcomes: BrainDesiredOutcome[];
  deliverables: { path: string; outcomeIds: string[] }[];
  constraints: string[];
  /** v1 is bounded, draft-only continuation. Recurring scheduling is not implied. */
  continuation: { mode: 'manual' | 'finish'; maxRuns: number; maxRefinementPasses: number };
}
/** A host-authenticated person's grant for one immutable scope snapshot.
 * Separate from FileApproval: reusing an asset is not permission to keep working.
 * Costs are host-defined units, never an implicit currency conversion. */
export interface BrainScopeGrant {
  schema: 'brain-scope-grant/v1';
  id: string;
  scope: BrainScopeRef;
  by: string;
  at: string;
  expiresAt: string;
  state: 'approved' | 'paused' | 'revoked';
  budget: { maxCostUnits: number; costUnit: string };
}
export interface BrainOutcomeObservation {
  schema: 'brain-outcome/v1';
  id: string;
  scope: BrainScopeRef;
  outcomeId: string;
  status: 'unmeasured' | 'met' | 'not-met';
  evidence: BrainSourceRef[];
  observedBy: string;
  observedAt: string;
  note: string;
}
export interface BrainDreamReceipt {
  schema: 'brain-dream-receipt/v1';
  id: string;
  scope: BrainScopeRef;
  grantId: string;
  sessionId: string;
  status: 'idle' | 'progressed' | 'needs-review' | 'blocked' | 'failed';
  reason: string;
  startedAt: string;
  finishedAt: string;
  inputs: BrainSourceRef[];
  outputs: BrainSourceRef[];
  /** References to existing ledgers; no duplicate tasks, reviews or file history. */
  cardIds: string[];
  revisionIds: string[];
  outcomeObservationIds: string[];
  usage: { runs: number; refinementPasses: number; costUnits: number; costUnit: string };
}

export type BrainContractResult<T> = { ok: true; value: T } | { ok: false; issues: string[] };
type Check = (value: unknown, path: string, issues: string[]) => void;
const fail = (issues: string[], path: string, why: string) => { issues.push(path + ': ' + why); };
const text: Check = (v,p,e) => { if (typeof v !== 'string' || !v.trim()) fail(e,p,'expected nonempty text'); };
const id: Check = (v,p,e) => { if (typeof v !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(v)) fail(e,p,'expected a portable identifier'); };
const hash: Check = (v,p,e) => { if (typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v)) fail(e,p,'expected lowercase SHA-256'); };
const timestamp: Check = (v,p,e) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) fail(e,p,'expected canonical UTC timestamp');
};
const number = (min: number, integer = true): Check => (v,p,e) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || (integer && !Number.isSafeInteger(v))) fail(e,p,'invalid nonnegative number or integer bound'); };
const choice = (...values: string[]): Check => (v,p,e) => { if (typeof v !== 'string' || !values.includes(v)) fail(e,p,'unsupported value'); };
const segment: Check = (v,p,e) => {
  if (typeof v !== 'string' || !v.trim() || v !== v.trim() || /[\\/:*?"<>|%\x00-\x1f]/.test(v) || /[. ]$/.test(v) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(v)) fail(e,p,'expected a portable path segment');
};
const relativePath: Check = (v,p,e) => {
  if (typeof v !== 'string' || !v || v.startsWith('/') || v.endsWith('/')) { fail(e,p,'expected a workspace-relative path'); return; }
  for (const part of v.split('/')) segment(part,p,e);
};
const array = (check: Check, min = 0): Check => (v,p,e) => {
  if (!Array.isArray(v) || v.length < min) { fail(e,p,'expected array with at least ' + min + ' entries'); return; }
  v.forEach((item,i) => check(item,p+'['+i+']',e));
};
const optional = (check: Check): Check => (v,p,e) => { if (v !== undefined) check(v,p,e); };
const object = (shape: Record<string,Check>): Check => (v,p,e) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) { fail(e,p,'expected object'); return; }
  const record = v as Record<string,unknown>;
  for (const key of Object.keys(record)) if (!Object.hasOwn(shape,key)) fail(e,p+'.'+key,'unknown field; use a supported schema version');
  for (const [key,check] of Object.entries(shape)) check(record[key],p+'.'+key,e);
};
const source = object({path:relativePath, sha256:optional(hash), revisionId:optional(text)});
const scopeRef = object({id, revision:number(1), sha256:hash});
const scopeCheck = object({
  schema:choice('brain-work-scope/v1'),id,revision:number(1),project:segment,intent:text,
  inputs:array(object({source,purpose:text})),
  outcomes:array(object({id,description:text,evidenceRequired:text}),1),
  deliverables:array(object({path:relativePath,outcomeIds:array(id,1)}),1),
  constraints:array(text),
  continuation:object({mode:choice('manual','finish'),maxRuns:number(1),maxRefinementPasses:number(0)}),
});
const grantCheck = object({schema:choice('brain-scope-grant/v1'),id,scope:scopeRef,by:text,at:timestamp,expiresAt:timestamp,state:choice('approved','paused','revoked'),budget:object({maxCostUnits:number(0,false),costUnit:text})});
const outcomeCheck = object({schema:choice('brain-outcome/v1'),id,scope:scopeRef,outcomeId:id,status:choice('unmeasured','met','not-met'),evidence:array(source),observedBy:text,observedAt:timestamp,note:text});
const receiptCheck = object({schema:choice('brain-dream-receipt/v1'),id,scope:scopeRef,grantId:id,sessionId:id,status:choice('idle','progressed','needs-review','blocked','failed'),reason:text,startedAt:timestamp,finishedAt:timestamp,inputs:array(source),outputs:array(source),cardIds:array(text),revisionIds:array(text),outcomeObservationIds:array(id),usage:object({runs:number(1),refinementPasses:number(0),costUnits:number(0,false),costUnit:text})});

function parse<T>(raw: unknown, check: Check, cross: (v:T,e:string[])=>void): BrainContractResult<T> {
  let value: unknown = raw;
  if (typeof raw === 'string') { try { value = JSON.parse(raw); } catch { return {ok:false,issues:['$: invalid JSON']}; } }
  const issues: string[] = [];
  check(value,'$',issues);
  if (!issues.length) cross(value as T,issues);
  return issues.length ? {ok:false,issues} : {ok:true,value:value as T};
}
export function parseBrainWorkScope(raw: unknown): BrainContractResult<BrainWorkScope> {
  return parse(raw,scopeCheck,(v,e)=>{
    const ids = new Set(v.outcomes.map(o=>o.id));
    if (ids.size !== v.outcomes.length) fail(e,'$.outcomes','duplicate outcome id');
    const paths = new Set(v.deliverables.map(d=>d.path));
    if (paths.size !== v.deliverables.length) fail(e,'$.deliverables','duplicate output path');
    for (const d of v.deliverables) {
      if (!d.path.startsWith(WS_WORK+'/'+v.project+'/')) fail(e,'$.deliverables','output must belong to the named project');
      if (d.path === brainWorkScopePath(v.project)) fail(e,'$.deliverables','scope cannot be its own deliverable');
      if (new Set(d.outcomeIds).size !== d.outcomeIds.length || d.outcomeIds.some(i=>!ids.has(i))) fail(e,'$.deliverables','unknown or duplicate outcome reference');
    }
  });
}
export function parseBrainScopeGrant(raw: unknown): BrainContractResult<BrainScopeGrant> {
  return parse(raw,grantCheck,(v,e)=>{ if (v.expiresAt <= v.at) fail(e,'$.expiresAt','must follow grant time'); });
}
export function parseBrainOutcomeObservation(raw: unknown): BrainContractResult<BrainOutcomeObservation> {
  return parse(raw,outcomeCheck,(v,e)=>{ if (v.status !== 'unmeasured' && (!v.evidence.length || v.evidence.some(s=>!s.sha256 && !s.revisionId))) fail(e,'$.evidence','measured outcomes require pinned evidence'); });
}
export function parseBrainDreamReceipt(raw: unknown): BrainContractResult<BrainDreamReceipt> {
  return parse(raw,receiptCheck,(v,e)=>{
    if (v.finishedAt < v.startedAt) fail(e,'$.finishedAt','cannot precede start');
    if (v.status === 'idle' && (v.outputs.length || v.revisionIds.length || v.outcomeObservationIds.length || v.usage.refinementPasses)) fail(e,'$.status','idle cannot claim production or new observations');
    if (v.status === 'progressed' && !v.outputs.length && !v.revisionIds.length && !v.outcomeObservationIds.length) fail(e,'$.status','progress needs an output, revision or outcome observation');
  });
}
/** Canonical scope bytes to hash as UTF-8 SHA-256 in a host. No grant fields
 * enter the digest. Hosts must compare it with the approved immutable snapshot. */
export function serializeBrainWorkScope(scope: BrainWorkScope): string {
  const parsed = parseBrainWorkScope(scope);
  if (!parsed.ok) throw new Error(parsed.issues.join('; '));
  const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([k,val])=>[k,canonical(val)])) : v;
  return JSON.stringify(canonical(parsed.value));
}
function checkedSegment(value: string, check: Check): string { const e:string[]=[];check(value,'path',e);if(e.length)throw new Error(e.join('; '));return value; }
export function brainWorkScopePath(project: string): string { return WS_WORK+'/'+checkedSegment(project,segment)+'/scope.json'; }
export function brainScopeGrantPath(grantId: string): string { return WS_META+'/scope-grants/'+checkedSegment(grantId,id)+'.json'; }
export function brainDreamReceiptPath(runId: string): string { return WS_META+'/dream-runs/'+checkedSegment(runId,id)+'.json'; }
export const BRAIN_OUTCOMES_FILE = WS_META+'/outcomes.jsonl';
