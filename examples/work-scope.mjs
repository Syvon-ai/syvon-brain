import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseBrainWorkScope, serializeBrainWorkScope, parseBrainScopeGrant, parseBrainOutcomeObservation, parseBrainDreamReceipt } from '@syvon/organism';
function checked(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; }
const scope = checked(parseBrainWorkScope({
  schema:'brain-work-scope/v1',id:'launch',revision:1,project:'demo',
  intent:'Keep launch communication accurate.',
  inputs:[{source:{path:'content/release.md',sha256:'a'.repeat(64)},purpose:'Approved product facts (synthetic example)'}],
  outcomes:[{id:'accuracy',description:'Launch communication matches current product facts.',evidenceRequired:'A reviewed comparison with the release notes.'}],
  deliverables:[{path:'projects/demo/launch.comp',outcomeIds:['accuracy']}],
  constraints:['Use the existing brand.','Keep all work as drafts.'],
  continuation:{mode:'finish',maxRuns:2,maxRefinementPasses:2},
}));
const digest = value => createHash('sha256').update(serializeBrainWorkScope(value),'utf8').digest('hex');
const reference = {id:scope.id,revision:scope.revision,sha256:digest(scope)};
// Synthetic record only. A real host authenticates the person, persists the
// immutable snapshot, checks current authority and reserves budgets atomically.
const grant = checked(parseBrainScopeGrant({schema:'brain-scope-grant/v1',id:'grant-demo',scope:reference,by:'demo-person',at:'2026-09-21T12:00:00.000Z',expiresAt:'2026-09-22T12:00:00.000Z',state:'approved',budget:{maxCostUnits:10,costUnit:'credits'}}));
const observation = checked(parseBrainOutcomeObservation({schema:'brain-outcome/v1',id:'observation-demo',scope:reference,outcomeId:'accuracy',status:'unmeasured',evidence:[],observedBy:'demo-person',observedAt:'2026-09-21T12:00:00.000Z',note:'Creating a deck would not, by itself, prove accuracy.'}));
const receipt = checked(parseBrainDreamReceipt({schema:'brain-dream-receipt/v1',id:'run-demo',scope:reference,grantId:grant.id,sessionId:'session-demo',status:'idle',reason:'No new approved input or unfinished authorized work.',startedAt:'2026-09-21T12:00:00.000Z',finishedAt:'2026-09-21T12:00:00.000Z',inputs:scope.inputs.map(i=>i.source),outputs:[],cardIds:[],revisionIds:[],outcomeObservationIds:[],usage:{runs:1,refinementPasses:0,costUnits:0,costUnit:'credits'}}));
assert.notEqual(digest({...scope,intent:'A different job'}), grant.scope.sha256);
assert.equal(observation.status,'unmeasured');
assert.equal(receipt.status,'idle');
console.log({scope:scope.id,scopeDigest:reference.sha256,grant:grant.id,outcome:observation.status,dream:receipt.status});
