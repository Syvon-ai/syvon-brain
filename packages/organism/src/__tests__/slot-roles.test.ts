import { describe, it, expect } from 'vitest';
import {
  assetRoleOfPath,
  kitPathOfAsset,
  kitRoleNameOfPath,
  classifyMediaSlot,
  isMediaSlotName,
  buildSlotMediaValues,
  focalToObjectPosition,
  slotFocusKey,
  slotFitKey,
  MEDIA_SLOT_FOLDER_ORDER,
  type SlotMediaPool,
} from '../dna/slot-roles';

describe('classifyMediaSlot', () => {
  it('sends a logo slot to the mark, never to the picture pool', () => {
    for (const name of ['brand_logo', 'logo', 'wordmark', 'logo_symbol', 'brand_mark']) {
      expect(classifyMediaSlot(name)).toBe('logo');
    }
  });

  it('reads the role out of the name', () => {
    expect(classifyMediaSlot('media_bg')).toBe('background');
    expect(classifyMediaSlot('backdrop')).toBe('background');
    expect(classifyMediaSlot('media_product')).toBe('product');
    expect(classifyMediaSlot('packshot_2')).toBe('product');
    expect(classifyMediaSlot('founder_portrait')).toBe('avatar');
    expect(classifyMediaSlot('team_photo')).toBe('avatar');
  });

  it('falls back to the hero pool for anything unnamed', () => {
    expect(classifyMediaSlot('media_photo')).toBe('image');
    expect(classifyMediaSlot('media_1')).toBe('image');
    expect(classifyMediaSlot('hero')).toBe('image');
  });
});

describe('isMediaSlotName', () => {
  it('covers what the five old private name-sets covered, and the ones they missed', () => {
    for (const name of ['media_bg', 'brand_logo', 'image', 'background', 'bg', 'video', 'audio']) {
      expect(isMediaSlotName(name)).toBe(true);
    }
    // The names the old sets did not know — the whole reason a `media_1` slot
    // was counted as text.
    expect(isMediaSlotName('media_1')).toBe(true);
    expect(isMediaSlotName('media_product')).toBe(true);
  });

  it('leaves text slots alone', () => {
    for (const name of ['headline', 'subline', 'body', 'cta_text', 'kicker']) {
      expect(isMediaSlotName(name)).toBe(false);
    }
  });
});

describe('buildSlotMediaValues', () => {
  const pool: SlotMediaPool = {
    byFolder: {
      bg: ['assets/bg/a.png', 'assets/bg/b.png'],
      imagery: ['assets/imagery/1.jpg', 'assets/imagery/2.jpg', 'assets/imagery/3.jpg'],
      products: ['assets/products/p.png'],
    },
    all: ['assets/imagery/1.jpg'],
    logo: 'assets/logos/logo.svg',
  };

  it('fills each slot from the folder that owns its role', () => {
    const v = buildSlotMediaValues(['media_bg', 'media_product', 'brand_logo'], pool, 'card')!;
    expect(v.media_bg).toMatch(/^assets\/bg\//);
    expect(v.media_product).toMatch(/^assets\/products\//);
    expect(v.brand_logo).toBe('assets/logos/logo.svg');
  });

  it('fills whatever the design declares, not a fixed vocabulary', () => {
    const v = buildSlotMediaValues(['media_1', 'hero_photo', 'founder_portrait'], pool, 'card')!;
    expect(Object.keys(v).sort()).toEqual(['founder_portrait', 'hero_photo', 'media_1']);
  });

  it('gives sibling slots different pictures while the pool has more', () => {
    const v = buildSlotMediaValues(['media_1', 'media_2', 'media_3'], pool, 'card')!;
    expect(new Set(Object.values(v)).size).toBe(3);
  });

  it('is stable per seed and different between seeds', () => {
    const a = buildSlotMediaValues(['media_1'], pool, 'projects/x/page-1.dsgn')!;
    const again = buildSlotMediaValues(['media_1'], pool, 'projects/x/page-1.dsgn')!;
    const b = buildSlotMediaValues(['media_1'], pool, 'projects/x/page-2.dsgn')!;
    expect(a).toEqual(again);
    expect(a.media_1).not.toBe(b.media_1);
  });

  it('leaves a logo slot empty rather than filling it with a photograph', () => {
    const noMark: SlotMediaPool = { ...pool, logo: null };
    const v = buildSlotMediaValues(['brand_logo', 'media_bg'], noMark, 'card')!;
    expect(v.brand_logo).toBeUndefined();
    expect(v.media_bg).toBeDefined();
  });

  it('falls through to the flat pool when no role folder has anything', () => {
    const flat: SlotMediaPool = { all: ['x.png'] };
    expect(buildSlotMediaValues(['media_bg'], flat, 'card')).toEqual({ media_bg: 'x.png' });
  });

  it('returns null when nothing can be filled', () => {
    expect(buildSlotMediaValues(['media_bg'], { all: [] }, 'card')).toBeNull();
    expect(buildSlotMediaValues([], pool, 'card')).toBeNull();
  });

  it('searches the role folder before the general hero pool', () => {
    expect(MEDIA_SLOT_FOLDER_ORDER.background[0]).toBe('imagery/bg');
    expect(MEDIA_SLOT_FOLDER_ORDER.product[0]).toBe('products');
    expect(MEDIA_SLOT_FOLDER_ORDER.avatar[0]).toBe('avatar');
  });
});

describe('a nested kit', () => {
  it('reads the kit path, not just the first segment', () => {
    expect(kitPathOfAsset('brands/b/assets/imagery/bg/dusk.png')).toBe('imagery/bg');
    expect(kitPathOfAsset('brands/b/assets/imagery/trucks/x.jpg')).toBe('imagery/trucks');
    expect(kitPathOfAsset('brands/b/assets/logo.svg')).toBeNull();
  });

  it('takes the DEEPEST segment that names a role', () => {
    expect(assetRoleOfPath('brands/b/assets/imagery/bg/dusk.png')).toBe('background');
    expect(assetRoleOfPath('brands/b/assets/bg/dusk.png')).toBe('background');
    expect(assetRoleOfPath('brands/b/assets/imagery/hero.png')).toBe('image');
    // A folder the table has never heard of inherits its parent.
    expect(assetRoleOfPath('brands/b/assets/imagery/trucks/x.jpg')).toBe('image');
    expect(assetRoleOfPath('brands/b/assets/somewhere/x.jpg')).toBeNull();
  });

  it('lets a folder declare a role the path does not name', () => {
    expect(assetRoleOfPath('brands/b/assets/imagery/plates/x.png', 'bg')).toBe('background');
  });

  it('stamps the role name a producer should record', () => {
    expect(kitRoleNameOfPath('brands/b/assets/imagery/bg/x.png')).toBe('bg');
    expect(kitRoleNameOfPath('brands/b/assets/imagery/trucks/x.png')).toBe('imagery');
  });

  it('searches both the new and the old location for backgrounds', () => {
    expect(MEDIA_SLOT_FOLDER_ORDER.background).toContain('imagery/bg');
    expect(MEDIA_SLOT_FOLDER_ORDER.background).toContain('bg');
    expect(MEDIA_SLOT_FOLDER_ORDER.background.indexOf('imagery/bg'))
      .toBeLessThan(MEDIA_SLOT_FOLDER_ORDER.background.indexOf('bg'));
  });

  it('reaches a free subfolder by prefix — the whole point', () => {
    const pool: SlotMediaPool = {
      byFolder: { 'imagery/trucks': ['t1.jpg', 't2.jpg'], 'imagery/bg': ['b1.png'] },
      all: [],
    };
    // A hero slot sees everything under imagery, including folders nobody
    // registered anywhere.
    const hero = buildSlotMediaValues(['media_photo'], pool, 'card')!;
    expect(hero.media_photo).toBeDefined();
    // A background slot prefers imagery/bg, which is listed first.
    const bg = buildSlotMediaValues(['media_bg'], pool, 'card')!;
    expect(bg.media_bg).toBe('b1.png');
  });
});

describe('the focal companion', () => {
  it('cannot collide with a slot name', () => {
    // Slot names are `[a-zA-Z_][a-zA-Z0-9_]*` — `@` is not in that grammar.
    expect(slotFocusKey('media_bg')).toBe('media_bg@focus');
    expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slotFocusKey('media_bg'))).toBe(false);
  });

  it('and neither can its fit sibling', () => {
    expect(slotFitKey('media_bg')).toBe('media_bg@fit');
    expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slotFitKey('media_bg'))).toBe(false);
  });

  it('prefers a point, and takes the middle of a zone', () => {
    expect(focalToObjectPosition({ focalPoint: { x: 40, y: 22 } })).toBe('40% 22%');
    expect(focalToObjectPosition({ focalZone: { top: 4, bottom: 40 } })).toBe('50% 22%');
    expect(focalToObjectPosition({ focalPoint: { x: 10, y: 10 }, focalZone: { top: 80, bottom: 90 } }))
      .toBe('10% 10%');
  });

  it('clamps nonsense and says nothing when the file said nothing', () => {
    expect(focalToObjectPosition({ focalPoint: { x: -10, y: 400 } })).toBe('0% 100%');
    expect(focalToObjectPosition(null)).toBeNull();
    expect(focalToObjectPosition({})).toBeNull();
  });
});
