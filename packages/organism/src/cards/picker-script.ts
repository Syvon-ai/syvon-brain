/**
 * THE PICKER SCRIPT — the red point, as it runs INSIDE the page.
 *
 * Its own module, importing nothing, for two reasons. It never runs in the
 * host's world at all — it runs in a web page, whether that page is Studio's
 * browser pane or the wrapper's own site under admin review — so it can be
 * evaluated in jsdom and tested for real (`picker-script.test.ts` does exactly
 * that: builds a DOM, holds the chord, clicks, and reads the pick back out).
 * And the hosts that install it (`apps/studio/electron/browser-spots.ts`, the
 * wrapper's review picker host) import `electron` or app code a test cannot.
 *
 * See those hosts for how it is installed and how the pick is pulled back —
 * and for why the guest is never given a way to push one.
 */
/**
 * THE PICKER, as it runs in the page.
 *
 * A string because it is evaluated in the guest's own world — there is no
 * module system between here and there, and no arguments cross over. It is
 * idempotent (a second install is a no-op) and re-installed on every
 * `dom-ready`, because a navigation replaces the document and everything in it.
 *
 * It draws its own highlight rather than reporting hover to the host: a fill
 * that had to make a round trip through main on every element crossed would
 * lag the pointer, and the host has no way to paint inside the guest anyway.
 * Red and label-above, the same two marks `SpotOverlay` draws, so the gesture
 * looks identical whichever side of the pane boundary the pointer is on.
 */
export const PICKER = String.raw`
(() => {
  if (window.__syvonSpot) { window.__syvonSpot.install(); return 'already'; }

  const RED = 'hsl(0 84% 58%)';
  /* THE BLUE POINT — Ctrl+Shift, a feedback pick: the same gesture, marked for
     the record rather than for work. Studio's own points use the same pair. */
  const BLUE = 'hsl(217 91% 60%)';
  const AT = 'data-card-at';
  const TARGET = 'data-card-target';
  const LABEL = 'data-card-label';
  const MARK = '__syvon_spot_ui';

  let pending = null;
  /* WHERE IN THE STACK THE POINTER IS, and how deep you have stepped into it.
     Reset whenever the pointer moves to a new pixel: the step is about THIS
     spot, and carrying it to the next one would light something arbitrary. */
  let stack = [];
  let step = 0;
  let at = { x: -1, y: -1, target: null };
  let fill = null;
  let tag = null;
  let style = null;

  const armed = (e) => e.ctrlKey || e.metaKey;
  let ink = false;

  /**
   * WHAT IS ACTUALLY UNDER THE POINTER — not what the event says.
   *
   * A page's own event target is the TOPMOST thing at that pixel, and modern
   * sites put page-sized elements on top of everything: a full-bleed wrapper, a
   * gradient layer, a motion container. Pointing anywhere then reported that
   * one element, over and over, which is why every point in the pane read as
   * one big div sitting on the whole site.
   *
   * 'elementsFromPoint' gives the entire stack at that pixel rather than its
   * lid, so the first thing in it that is not page-sized is the thing a person
   * believes they are pointing at. Sixty percent of the viewport is the line:
   * below it an element is a piece of the page, above it it is scenery.
   *
   * The event target is the fallback, for a document that has no layout to hit
   * test — jsdom, where this script is tested — and for the case where the
   * whole stack is scenery.
   */
  function elementAt(x, y, target) {
    return candidatesAt(x, y, target)[0] || null;
  }

  /**
   * EVERYTHING AT THIS PIXEL, best guess first.
   *
   * The picker used to CHOOSE for you: skip anything page-sized, see through
   * wrappers, take what is left. Good defaults, and still the first entry here
   * — but a default is a guess, and when it guesses wrong there has to be a way
   * to say so. That is what this list is for: the wheel steps through it while
   * the chord is held, so the thing underneath, and the section around it, are
   * both reachable without the picker having to be right the first time.
   *
   * Ordered nearest-thing-first: the default, then the hit stack as the browser
   * reports it, which runs from the topmost element outward through its
   * ancestors and down through whatever is painted beneath. Stepping forward is
   * therefore "wider, or further under", which is the direction a person means
   * when the highlight is on the wrong thing.
   */
  function candidatesAt(x, y, target) {
    const usable = (el) => el instanceof Element && !el.closest('[' + MARK + ']');
    const stack = typeof document.elementsFromPoint === 'function' && (x || y)
      ? document.elementsFromPoint(x, y).filter(usable)
      : [];
    const page = (window.innerWidth || 0) * (window.innerHeight || 0);

    /* THE DEFAULT — the first thing at this pixel that is a piece of the page
       rather than scenery, seen through whatever wraps it. */
    let best = null;
    let smallest = null;
    let smallestArea = Infinity;
    for (const el of stack) {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (!page || area <= page * 0.6) { best = throughWrappers(el); break; }
      if (area < smallestArea) { smallestArea = area; smallest = el; }
    }
    /* EVERY LAYER IS SCENERY. A hero is often taller than the viewport and the
       things in it are full-width, so the whole stack can be over the line —
       and the TOP of that stack is the veil, the worst possible answer. The
       smallest of them is the most specific thing at that pixel. */
    if (!best && smallest) best = throughWrappers(smallest);
    if (!best && usable(target)) best = throughWrappers(target);

    const list = [];
    const add = (el) => { if (el && list.indexOf(el) === -1) list.push(el); };
    add(best);
    for (const el of stack) add(el);
    /* THE WAY OUT. With no layout to hit test — jsdom, and a document mid-load
       — the stack is empty and the ancestors are the only candidates there are. */
    if (list.length < 2 && best) {
      let cur = best.parentElement;
      while (cur && list.length < 12) { add(cur); cur = cur.parentElement; }
    }
    return list;
  }

  /**
   * SEE THROUGH A WRAPPER THAT IS NOT CONTENT.
   *
   * Sites wrap their content in nodes that exist for a reason that is not the
   * page: an entrance animation, a scroll reveal, a measurement box. They hold
   * one child, they have no words of their own, and they are exactly the size of
   * what is inside them — so they sit ON TOP of the thing you are pointing at
   * and the hit test lands on them every time. Picking one gives you a card
   * about 'div.sd-enter', which names the animation rather than the headline.
   *
   * The rule is structural, not a list of class names: one element child, no
   * text of its own, and a box the child fills. Anything that fails those is
   * doing something of its own and is a real answer. Bounded, because a chain
   * of ten wrappers is unusual and an unbounded descent through a list would
   * walk to a leaf nobody pointed at.
   */
  function throughWrappers(el) {
    let cur = el;
    for (let i = 0; i < 8; i++) {
      const kids = cur.children;
      if (kids.length !== 1) return cur;
      const child = kids[0];
      let ownText = false;
      for (const n of cur.childNodes) {
        if (n.nodeType === 3 && (n.textContent || '').trim()) { ownText = true; break; }
      }
      if (ownText) return cur;
      const a = cur.getBoundingClientRect();
      const b = child.getBoundingClientRect();
      if (!b.width || !b.height) return cur;
      /* THE CHILD FILLS IT. Two pixels of slack for a border or a rounding. */
      if (Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2) return cur;
      cur = child;
    }
    return cur;
  }

  /**
   * WHERE AN ELEMENT SITS INSIDE THE PART THAT NAMES ITSELF.
   *
   * A page marks what it can — a section, a component — and everything inside
   * that is unmarked, so 'closest' walked up and the whole section was the
   * answer. That is a true address and a useless one: nobody wants to say "the
   * hero" when they mean the third line of it.
   *
   * So the address is completed from the DOM: tag plus its index among
   * same-tag siblings, the same vocabulary 'componentLayerAddressMap' writes
   * for a '.react' ('div[0]/h1[1]'), so the two halves of the product spell an
   * address the same way. Capped, because a path nobody can read is not an
   * address — past a dozen steps the section itself is the better answer.
   */
  function pathFrom(root, el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== root && cur.parentElement && parts.length < 12) {
      const parent = cur.parentElement;
      const tag = cur.tagName.toLowerCase();
      let n = 0;
      for (const sib of parent.children) {
        if (sib === cur) break;
        if (sib.tagName.toLowerCase() === tag) n++;
      }
      parts.unshift(tag + '[' + n + ']');
      cur = parent;
    }
    return cur === root ? parts.join('/') : '';
  }

  /** What to call it: its id, else its first class, else its tag and its words. */
  function labelFor(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + el.id;
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
    if (cls) return tag + '.' + cls.slice(0, 24);
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) return tag + ' “' + text.slice(0, 24) + (text.length > 24 ? '…' : '') + '”';
    return tag;
  }

  /** The spot for one element: where it sits, and the file it is in. */
  function spotOf(el, depth, total) {
    if (!el) return null;
    const part = el.closest('[' + AT + ']');
    const box = (part || el).closest('[' + TARGET + ']');
    if (!box) return null;
    const anchor = part || box;
    const base = part ? part.getAttribute(AT) || '' : '';
    const inner = el === anchor ? '' : pathFrom(anchor, el);
    /* THE ELEMENT'S OWN BOX, not the section's — the highlight has to say which
       thing, and a fill over the whole hero says nothing. */
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const name = inner ? labelFor(el) : (part && part.getAttribute(LABEL)) || base || '';
    return {
      target: box.getAttribute(TARGET) || '',
      at: inner ? (base ? base + '/' + inner : inner) : base,
      /* THE COUNT IS ON THE TAG, not in the address — it says how far into the
         stack you have stepped and how much is left, which is the one thing you
         cannot see from the fill alone. It is stripped from the card. */
      label: name,
      tag: total > 1 ? name + '  ' + (depth + 1) + '/' + total : name,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    };
  }

  /** The spot under a point, at the current step into its stack. */
  function spotFor(x, y, target) {
    /* THE TARGET IS PART OF THE POSITION. Two presses can report the same
       coordinates and mean different elements — a document with no layout to
       hit test reports 0,0 for everything — and reusing the stack across them
       lights whatever was under the pointer last time. */
    if (x !== at.x || y !== at.y || target !== at.target) {
      at = { x: x, y: y, target: target };
      step = 0;
      stack = candidatesAt(x, y, target);
    }
    if (!stack.length) return null;
    if (step >= stack.length) step = stack.length - 1;
    if (step < 0) step = 0;
    return spotOf(stack[step], step, stack.length);
  }

  function ui() {
    if (fill) return;
    style = document.createElement('style');
    style.setAttribute(MARK, '');
    style.textContent = 'html.__syvon-spot-armed, html.__syvon-spot-armed * { cursor: crosshair !important; }';
    fill = document.createElement('div');
    tag = document.createElement('div');
    for (const el of [fill, tag]) {
      el.setAttribute(MARK, '');
      el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;display:none;';
    }
    fill.style.background = 'hsl(0 84% 58% / 0.15)';
    fill.style.borderRadius = '2px';
    tag.style.background = RED;
    tag.style.color = '#fff';
    tag.style.font = '500 11px/1.6 system-ui, sans-serif';
    tag.style.padding = '0 8px';
    tag.style.borderRadius = '999px';
    tag.style.maxWidth = '280px';
    tag.style.overflow = 'hidden';
    tag.style.textOverflow = 'ellipsis';
    tag.style.whiteSpace = 'nowrap';
    (document.body || document.documentElement).append(style, fill, tag);
  }

  function draw(spot) {
    ui();
    document.documentElement.classList.toggle('__syvon-spot-armed', !!spot);
    if (!spot) {
      fill.style.display = 'none';
      tag.style.display = 'none';
      return;
    }
    const r = spot.rect;
    fill.style.background = ink ? 'hsl(217 91% 60% / 0.15)' : 'hsl(0 84% 58% / 0.15)';
    tag.style.background = ink ? BLUE : RED;
    fill.style.display = 'block';
    fill.style.left = r.left + 'px';
    fill.style.top = r.top + 'px';
    fill.style.width = r.width + 'px';
    fill.style.height = r.height + 'px';
    if (spot.tag || spot.label) {
      tag.style.display = 'block';
      tag.style.left = r.left + 'px';
      tag.style.top = Math.max(2, r.top - 20) + 'px';
      tag.textContent = spot.tag || spot.label;
    } else {
      tag.style.display = 'none';
    }
  }

  const onMove = (e) => {
    if (!armed(e)) { draw(null); return; }
    ink = !!e.shiftKey;
    draw(spotFor(e.clientX, e.clientY, e.target));
  };
  /* BOTH HALVES OF THE PRESS ARE SWALLOWED, for the same reason they are in
     Studio: a card written on a row is not also a click of that row. */
  const swallow = (e) => {
    if (!armed(e) || !spotFor(e.clientX, e.clientY, e.target)) return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  };
  const onClick = (e) => {
    if (!swallow(e)) return;
    const spot = spotFor(e.clientX, e.clientY, e.target);
    if (!spot) return;
    pending = e.shiftKey ? Object.assign({}, spot, { feedback: true }) : spot;
    draw(null);
    /* A NOTICE TO THE PAGE ITSELF, never to a host: an in-page host (the
       wrapper's review bar) listens for it instead of polling. Studio's pane
       cannot hear a DOM event from main and keeps pulling, as before. */
    try { window.dispatchEvent(new CustomEvent('syvon:spot')); } catch (_) {}
  };
  /**
   * THE WHEEL STEPS THROUGH WHAT IS AT THIS PIXEL.
   *
   * Held chord plus wheel: one notch per step, outward through the stack and
   * back. This is the answer to "I want the one underneath" — the picker offers
   * its best guess and you walk from there, reading the tag as you go, instead
   * of the picker having to be right the first time.
   *
   * Swallowed, so the page does not scroll and the browser does not zoom out
   * from under the thing being pointed at.
   */
  const onWheel = (e) => {
    if (!armed(e) || !stack.length) return;
    e.preventDefault();
    e.stopPropagation();
    const next = step + (e.deltaY > 0 ? 1 : -1);
    step = next < 0 ? 0 : next >= stack.length ? stack.length - 1 : next;
    draw(spotOf(stack[step], step, stack.length));
  };

  const onKey = (e) => { if (!armed(e)) draw(null); };
  const off = () => draw(null);

  const opts = true;
  function install() {
    document.addEventListener('mousemove', onMove, opts);
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('pointerdown', swallow, opts);
    document.addEventListener('mousedown', swallow, opts);
    document.addEventListener('mouseup', swallow, opts);
    document.addEventListener('click', onClick, opts);
    document.addEventListener('keyup', onKey, opts);
    window.addEventListener('blur', off);
  }

  window.__syvonSpot = {
    install,
    /** The host's only read. Hands the pick over once and forgets it. */
    take() { const p = pending; pending = null; return p; },
    disarm: off,
  };
  install();
  return 'installed';
})()
`;
