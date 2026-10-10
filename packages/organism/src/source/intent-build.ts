/**
 * THE FAST BUILD — every piece's words, from the story, in one ask.
 *
 * The slow way was an agent loop: read, copy, write a source, validate, one
 * piece after the other, a model round trip each step. Everything here but
 * the WORDS is code: which slots each piece has (its source's header rows),
 * what they held (the template's samples, a length to aim for), and putting
 * the answers back (the source's rows — the deck follows its source). The
 * words themselves are one model call for the whole set, so the pieces are
 * written together and tell one story.
 *
 * Pure: the host copies the templates, makes the call and writes the files.
 */

import { headerValue, parseSource, setPart } from './source-doc';
import { STORY_KEYS, setStory, storyOf, type Story } from './project-source';

/** Header rows that are addresses, not words. */
const NOT_WORDS = new Set(['name', 'page', 'shot', 'comp', 'template', 'framework']);
/** A value that is a picture or a placeholder to fill, not words. */
const NOT_TEXT = /^\{[^}]*\}$|\.(png|jpe?g|webp|gif|svg|avif|mp4|mov|webm)$|^(https?:)?\/\//i;

export interface DeckWords {
  /** The comp file, as the intent's part names it. */
  comp: string;
  /** What the part asks of this piece — its lines in the intent. */
  brief: string;
  /** Its parts: index in the source, name, and the word slots with what they hold now. */
  parts: Array<{ part: number; name: string; job: string; slots: Record<string, string> }>;
}

/** The word slots of one deck's source — what the model is asked to write. */
export function wordSlotsOf(source: string, comp: string, brief: string): DeckWords {
  const parts = parseSource(source).parts.flatMap((p, i) => {
    const slots: Record<string, string> = {};
    for (const [k, v] of p.header) {
      if (NOT_WORDS.has(k) || typeof v !== 'string' || NOT_TEXT.test(v.trim())) continue;
      slots[k] = v;
    }
    if (!Object.keys(slots).length) return [];
    return [{ part: i, name: String(headerValue(p.header, 'name') ?? `Part ${i + 1}`), job: p.body.split('\n')[0]?.trim() ?? '', slots }];
  });
  return { comp, brief, parts };
}

/** The one ask: the story (rows to fill) and every piece's slots, answered as JSON. */
export function wordsPrompt(intentText: string, decks: readonly DeckWords[]): { system: string; user: string } {
  const doc = parseSource(intentText);
  const story = storyOf(intentText);
  const empty = STORY_KEYS.filter((k) => k !== 'media' && k !== 'proof' && !story[k]);
  const system =
    'You write the words of a set of brand pieces that all tell ONE story. ' +
    'Reply with JSON only: {"story": {<each empty story row>: "<value>"}, "decks": {"<comp file>": [{"part": <index>, "slots": {"<slot>": "<words>"}}]}}. ' +
    'Rules: fill every empty story row you are given; framework is one name from: PAS, AIDA, SCQA, FAB, Hook-Value-Proof-Action, Audience-Problem-Category-Difference-Proof-Promise, Before-After-Bridge, Answer First. ' +
    'Write every slot you are given, for every part, in the language of the intent — replace every sample word. Keep each slot close to the length of its sample (a kicker stays a few words, a headline a line). ' +
    'Numbered slots (01, 02…) keep their numbering. Never invent facts, figures, names or quotes: use only what the intent and proof say. ' +
    'Where a slot needs one you do not have — a customer quote and who said it, a statistic, a price — write a short bracketed prompt for the person instead, e.g. "[A customer\'s words on packing light]", "[Name, role]", "[Share of trips under 3 days]". Never leave a sample word in place. ' +
    'Each piece follows its part\'s brief and the framework, and all pieces share the proposition, tone and call to action.';
  const user = JSON.stringify(
    {
      title: doc.title,
      intent: doc.treatment,
      story,
      storyToFill: empty,
      pieces: decks.map((d) => ({ comp: d.comp, brief: d.brief, parts: d.parts })),
    },
    null,
    1,
  );
  return { system, user };
}

export interface WordsAnswer {
  story?: Story;
  decks?: Record<string, Array<{ part: number; slots: Record<string, string> }>>;
}

/** Read the model's answer; anything malformed is dropped, never thrown. */
export function readWordsAnswer(raw: string): WordsAnswer {
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')) as WordsAnswer;
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

/** The story rows the answer fills — empty ones only, never `proof` (facts are the person's). */
export function applyStoryAnswer(intentText: string, answer: WordsAnswer): string {
  const have = storyOf(intentText);
  const patch: Story = {};
  for (const k of STORY_KEYS) {
    if (k === 'proof' || k === 'media' || have[k]) continue;
    const v = answer.story?.[k];
    if (typeof v === 'string' && v.trim()) patch[k] = v.trim();
  }
  return Object.keys(patch).length ? setStory(intentText, patch) : intentText;
}

/** One deck's source with the answered words in its slots — only slots it has. */
export function applyWords(source: string, words: ReadonlyArray<{ part: number; slots: Record<string, string> }> | undefined): string {
  if (!words?.length) return source;
  let next = source;
  for (const w of words) {
    const p = parseSource(next).parts[w.part];
    if (!p || !w.slots || typeof w.slots !== 'object') continue;
    const header = p.header.map(([k, v]) => {
      const nv = w.slots[k];
      if (NOT_WORDS.has(k) || typeof v !== 'string' || NOT_TEXT.test(v.trim())) return [k, v] as [string, typeof v];
      return typeof nv === 'string' && nv.trim() ? ([k, nv.trim()] as [string, string]) : ([k, v] as [string, typeof v]);
    });
    next = setPart(next, w.part, { header });
  }
  return next;
}
