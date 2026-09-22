/**
 * THE PICKER, EXERCISED FOR REAL.
 *
 * Not a re-implementation of its rules in the test — the actual string that is
 * evaluated in the browser pane, evaluated here in jsdom. That is the whole
 * reason it lives in a module of its own: it is the one part of this feature
 * that runs in a web page rather than in Electron, so a test can be the page.
 *
 * What it pins down is the contract, which is the part that breaks silently:
 * which chord picks, what a pick says, and — the two that would go unnoticed
 * until someone complained the gesture "does nothing" — that Ctrl+Shift is left
 * alone for the Builder, and that an unmarked page lights nothing rather than
 * carding whatever happened to be under the pointer.
 */
import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { PICKER } from './picker-script';

interface Picker {
  take: () => { target: string; at: string; label: string; rect: { left: number; top: number; width: number; height: number } } | null;
  disarm: () => void;
}

let dom: JSDOM;
let win: Window & typeof globalThis & { __syvonSpot: Picker };

/**
 * A page with one file on it and one part inside that file.
 *
 * The rect stub is not decoration. jsdom lays nothing out, so every
 * `getBoundingClientRect` is 0×0 — and the picker refuses a zero-size element
 * on purpose (there is no box to light, and `openReviewCard` would take a
 * degenerate anchor). Without a box, every spot in this file would resolve to
 * null and the suite would pass its negative cases while proving nothing.
 */
function page(html: string): void {
  dom = new JSDOM(`<!doctype html><body>${html}</body>`, { runScripts: 'outside-only', pretendToBeVisual: true });
  win = dom.window as unknown as typeof win;
  win.Element.prototype.getBoundingClientRect = function () {
    return { left: 10, top: 20, width: 300, height: 120, right: 310, bottom: 140, x: 10, y: 20, toJSON: () => ({}) } as DOMRect;
  };
  win.eval(PICKER);
}

/** Press something the way a person does — both halves, then the click. */
function press(el: Element, chord: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean }): void {
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ...chord }));
  }
}

const MARKED = `
  <div data-card-target="wrapper/site.json">
    <div id="hero" data-card-at="sections/0" data-card-label="syvon-hero">the hero</div>
    <div id="plain">no address of its own</div>
  </div>`;

describe('the browser pane picker', () => {
  beforeEach(() => page(MARKED));

  it('installs once and answers a second install without re-arming', () => {
    expect(win.eval(PICKER)).toBe('already');
  });

  it('cards the part under a Ctrl+click, with the file it belongs to', () => {
    press(win.document.getElementById('hero')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toMatchObject({
      target: 'wrapper/site.json',
      at: 'sections/0',
      label: 'syvon-hero',
    });
  });

  it('hands a pick over exactly once', () => {
    press(win.document.getElementById('hero')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).not.toBeNull();
    expect(win.__syvonSpot.take()).toBeNull();
  });

  it('takes Ctrl+Shift as the blue point — the same pick, marked as feedback', () => {
    press(win.document.getElementById('hero')!, { ctrlKey: true, shiftKey: true });
    expect(win.__syvonSpot.take()).toMatchObject({ target: 'wrapper/site.json', feedback: true });
  });

  it('marks a plain Ctrl pick as no feedback', () => {
    press(win.document.getElementById('hero')!, { ctrlKey: true });
    expect((win.__syvonSpot.take() as { feedback?: boolean }).feedback).toBeUndefined();
  });

  it('tells the page itself that a pick is waiting', () => {
    let heard = 0;
    win.addEventListener('syvon:spot', () => { heard += 1; });
    press(win.document.getElementById('hero')!, { ctrlKey: true });
    expect(heard).toBe(1);
  });

  it('does nothing without the chord', () => {
    press(win.document.getElementById('hero')!, {});
    expect(win.__syvonSpot.take()).toBeNull();
  });

  it('addresses an unmarked element by where it sits, not by the box around it', () => {
    // A page marks what it can — a section, a component — and everything
    // inside it is unmarked. Resolving those to the enclosing box was a true
    // address and a useless one: every point in the pane came back as the same
    // wrapper, and you could not say anything about the thing you were
    // actually looking at. The path is completed from the DOM instead.
    press(win.document.getElementById('plain')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toMatchObject({
      target: 'wrapper/site.json',
      at: 'div[1]',
      label: 'div#plain',
    });
  });

  it('still says the whole file when the file box itself is pointed at', () => {
    press(win.document.querySelector('[data-card-target]')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toMatchObject({ target: 'wrapper/site.json', at: '' });
  });

  it('keeps the marked part address, and refines below it', () => {
    page(`
      <div data-card-target="wrapper/site.json">
        <section id="hero" data-card-at="sections/0" data-card-label="syvon-hero">
          <h1 id="head">Design in Flow</h1>
          <p>and a line under it</p>
        </section>
      </div>`);
    press(win.document.getElementById('head')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toMatchObject({
      target: 'wrapper/site.json',
      at: 'sections/0/h1[0]',
      label: 'h1#head',
    });
  });

  it('sees past a page-sized overlay to the thing under it', () => {
    /*
     * THE COMPLAINT THIS IS FOR: "everything is just a big div on top of the
     * wrapper". A site's own event target is the TOPMOST element at that pixel,
     * and a full-bleed wrapper or a motion container sits over the whole page —
     * so every point in the pane reported that one element. `elementsFromPoint`
     * hands back the whole stack; the first entry that is not page-sized is the
     * thing a person believes they are pointing at.
     *
     * jsdom lays nothing out, so the stack and the two boxes are stubbed. What
     * is being tested is the CHOICE between them, which is all the picker
     * contributes here.
     */
    dom = new JSDOM(
      `<!doctype html><body>
        <div data-card-target="wrapper/site.json">
          <p id="line">the line you meant</p>
          <div id="veil">a full-page overlay</div>
        </div>
      </body>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    win = dom.window as unknown as typeof win;
    const veil = win.document.getElementById('veil')!;
    const line = win.document.getElementById('line')!;
    const rect = (w: number, h: number) =>
      ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    win.Element.prototype.getBoundingClientRect = function (this: Element) {
      // The veil covers the viewport; everything else is a piece of the page.
      return this === veil ? rect(win.innerWidth, win.innerHeight) : rect(120, 24);
    };
    (win.document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] })
      .elementsFromPoint = () => [veil, line];
    win.eval(PICKER);

    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      veil.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, clientX: 40, clientY: 40 }));
    }
    expect(win.__syvonSpot.take()).toMatchObject({
      target: 'wrapper/site.json',
      at: 'p[0]',
      label: 'p#line',
    });
  });

  it('sees through an entrance wrapper to the content inside it', () => {
    /*
     * "I still have the div.sd-enter on top of things." Sites wrap content in
     * nodes that exist for the animation rather than for the page: one child,
     * no words of their own, exactly the size of what is inside. The hit test
     * lands on them every time, and the card ends up about the wrapper.
     */
    dom = new JSDOM(
      `<!doctype html><body>
        <div data-card-target="wrapper/site.json">
          <section data-card-at="sections/0">
            <div class="sd-enter"><div class="sd-enter-inner"><h1 id="head">Design in Flow</h1></div></div>
          </section>
        </div>
      </body>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    win = dom.window as unknown as typeof win;
    const box = { left: 0, top: 0, width: 400, height: 60, right: 400, bottom: 60, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    // The wrappers and the headline share a box — which is what makes them
    // wrappers, and what the picker keys on.
    win.Element.prototype.getBoundingClientRect = function () { return box; };
    const wrapper = win.document.querySelector('.sd-enter')!;
    (win.document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] })
      .elementsFromPoint = () => [wrapper];
    win.eval(PICKER);
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      wrapper.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, clientX: 10, clientY: 10 }));
    }
    expect(win.__syvonSpot.take()).toMatchObject({
      at: 'sections/0/div[0]/div[0]/h1[0]',
      label: 'h1#head',
    });
  });

  it('keeps a wrapper that is doing something of its own', () => {
    // Two children, or words of its own, means it is content and not scenery.
    dom = new JSDOM(
      `<!doctype html><body>
        <div data-card-target="wrapper/site.json">
          <div id="pair"><span>one</span><span>two</span></div>
        </div>
      </body>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    win = dom.window as unknown as typeof win;
    const box = { left: 0, top: 0, width: 400, height: 60, right: 400, bottom: 60, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    win.Element.prototype.getBoundingClientRect = function () { return box; };
    const pair = win.document.getElementById('pair')!;
    (win.document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] })
      .elementsFromPoint = () => [pair];
    win.eval(PICKER);
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      pair.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, clientX: 10, clientY: 10 }));
    }
    expect(win.__syvonSpot.take()).toMatchObject({ at: 'div[0]', label: 'div#pair' });
  });

  it('steps through what is at the pixel — the wheel reaches the one underneath', () => {
    /*
     * The picker offers a best guess and can be wrong; this is the way to say
     * so. One notch of the wheel per step, outward through the hit stack, with
     * the tag naming what you are on — so the thing under an overlay, and the
     * section around it, are both reachable without the guess having to be
     * right.
     */
    dom = new JSDOM(
      `<!doctype html><body>
        <section data-card-target="wrapper/site.json" data-card-at="sections/0" data-card-label="syvon-hero">
          <h1 id="head">Design in Flow</h1>
        </section>
      </body>`,
      { runScripts: 'outside-only', pretendToBeVisual: true },
    );
    win = dom.window as unknown as typeof win;
    const box = { left: 0, top: 0, width: 200, height: 40, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    win.Element.prototype.getBoundingClientRect = function () { return box; };
    const head = win.document.getElementById('head')!;
    const hero = win.document.querySelector('section')!;
    (win.document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] })
      .elementsFromPoint = () => [head, hero];
    win.eval(PICKER);

    const move = () => head.dispatchEvent(new win.MouseEvent('mousemove', { bubbles: true, ctrlKey: true, clientX: 12, clientY: 12 }));
    const wheel = (dy: number) =>
      head.dispatchEvent(new win.WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: dy, clientX: 12, clientY: 12 }));
    const pick = () => {
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
        head.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, ctrlKey: true, clientX: 12, clientY: 12 }));
      }
      return win.__syvonSpot.take();
    };

    // The default is the headline.
    move();
    expect(pick()).toMatchObject({ at: 'sections/0/h1[0]', label: 'h1#head' });

    // One notch out: the section it belongs to.
    move();
    wheel(1);
    expect(pick()).toMatchObject({ at: 'sections/0', label: 'syvon-hero' });

    // And back in.
    move();
    wheel(1);
    wheel(-1);
    expect(pick()).toMatchObject({ at: 'sections/0/h1[0]' });
  });

  it('lights nothing on a page that publishes no target', () => {
    page('<div id="loose">an ordinary web page</div>');
    press(win.document.getElementById('loose')!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toBeNull();
  });

  it('swallows the press so the page underneath never sees the click', () => {
    let reached = false;
    const hero = win.document.getElementById('hero')!;
    win.document.body.addEventListener('click', () => { reached = true; });
    press(hero, { ctrlKey: true });
    expect(reached).toBe(false);
  });

  it('lets an ordinary click through untouched', () => {
    let reached = false;
    win.document.body.addEventListener('click', () => { reached = true; });
    press(win.document.getElementById('hero')!, {});
    expect(reached).toBe(true);
  });

  it('never marks its own overlay as a spot', () => {
    press(win.document.getElementById('hero')!, { ctrlKey: true });
    win.__syvonSpot.take();
    const own = win.document.querySelector('[__syvon_spot_ui]');
    expect(own).not.toBeNull();
    press(own!, { ctrlKey: true });
    expect(win.__syvonSpot.take()).toBeNull();
  });
});
