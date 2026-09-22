import { describe, it, expect } from 'vitest';
import { buildSceneAnswer, parseSceneAnswer, scenePath, scenesInOrder, SCENES_DIR } from './answer-manifest';

describe('scene answer manifest (answer/v1)', () => {
  it('builds a scene that defaults to directing, and promotes to made once members exist', () => {
    const a = buildSceneAnswer({ id: 'ways-in', title: 'Three ways in' });
    expect(a.status).toBe('directing');
    expect(a.options).toEqual([]);
    expect(a.sessionId).toBeNull();
    expect(a.config.layout).toBe('grid');

    const b = buildSceneAnswer({
      id: 'ways-in',
      title: 'Three ways in',
      members: [{ path: 'projects/x/anchor.comp' }],
    });
    expect(b.status).toBe('made');
  });

  it('round-trips through parse', () => {
    const scene = buildSceneAnswer({
      id: 'ways-in',
      title: 'Three ways in',
      sessionId: 'cli-123',
      options: [
        { id: 'recreate-motion', label: 'Recreate the motion', state: 'offered', confidence: 'high' },
        { id: 'cut-shots', label: 'Cut into shots', state: 'declined' },
      ],
      members: [{ path: 'projects/x/storyboard.comp', note: 'the anchor cut' }],
      status: 'made',
    });
    const parsed = parseSceneAnswer(JSON.stringify(scene));
    // updatedAt is generated; compare the rest.
    expect(parsed && { ...parsed, updatedAt: scene.updatedAt }).toEqual(scene);
  });

  it('drops malformed entries rather than failing the whole scene', () => {
    const doc = JSON.stringify({
      $schema: 'answer/v1',
      id: 'ways-in',
      title: 'Three ways in',
      options: [{ id: 'ok', label: 'Fine', state: 'offered' }, { id: 'no-label', state: 'offered' }, 'junk'],
      members: [{ path: 'a.comp' }, { note: 'no path' }],
      status: 'working',
    });
    const parsed = parseSceneAnswer(doc)!;
    expect(parsed.options).toHaveLength(1);
    expect(parsed.members).toHaveLength(1);
    expect(parsed.status).toBe('working');
  });

  it('rejects what is not a scene', () => {
    expect(parseSceneAnswer('not json')).toBeNull();
    expect(parseSceneAnswer(JSON.stringify({ $schema: 'surface-project/v1', order: [] }))).toBeNull();
    expect(parseSceneAnswer(JSON.stringify({ $schema: 'answer/v1', title: 'no id' }))).toBeNull();
  });

  it('orders newest first and names its home', () => {
    const older = { ...buildSceneAnswer({ id: 'a', title: 'A' }), updatedAt: '2026-01-01T00:00:00Z' };
    const newer = { ...buildSceneAnswer({ id: 'b', title: 'B' }), updatedAt: '2026-02-01T00:00:00Z' };
    expect(scenesInOrder([older, newer]).map((s) => s.id)).toEqual(['b', 'a']);
    expect(SCENES_DIR).toBe('meta/scenes');
    expect(scenePath('ways-in')).toBe('meta/scenes/ways-in.json');
  });
});
