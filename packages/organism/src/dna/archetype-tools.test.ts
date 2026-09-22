import { describe, it, expect } from 'vitest';
import { MAKER_TOOLS, MAKER_SHARED } from './archetype-tools';
// Registry-implementation closure is a host integration check. Tool execution
// lives outside this repository; retain the standalone audience invariant here.
describe('archetype audience invariant', () => {
  it('keeps the subscriber surface a subset of the maker surface', () => {
    const maker = new Set(MAKER_TOOLS);
    expect(MAKER_SHARED.filter(name => !maker.has(name))).toEqual([]);
  });
});
