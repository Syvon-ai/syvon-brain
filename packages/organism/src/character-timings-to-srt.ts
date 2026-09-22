/**
 * Converts ElevenLabs character-level alignment into SRT subtitle blocks.
 * Glues characters into words (by spaces), then groups words into SRT blocks.
 *
 * Lives here because BOTH sides of the voice lane need it and neither owns the
 * other: the agent's `generate_voice` tool writes the .srt beside the audio it
 * just produced, and the brain's director does the same for its own TTS. They
 * carried byte-identical forks until 2026-08-08, which is exactly the shape of
 * bug that shows up as "captions drift on one lane only".
 *
 * Dependency-free on purpose — it is pure arithmetic over the alignment arrays,
 * so it costs nothing to sit in the shared barrel.
 */

export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface WordTiming {
  word: string;
  startSeconds: number;
  endSeconds: number;
}

/**
 * Glue character timings into words by splitting on spaces.
 * Returns one entry per word with start/end from first to last character.
 */
export function charactersToWords(alignment: CharacterAlignment): WordTiming[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  if (
    characters.length !== character_start_times_seconds.length ||
    characters.length !== character_end_times_seconds.length
  ) {
    return [];
  }
  const words: WordTiming[] = [];
  let wordChars: string[] = [];
  let wordStart: number | null = null;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const start = character_start_times_seconds[i];

    if (ch === ' ' || ch === '\n' || ch === '\t') {
      if (wordChars.length > 0 && wordStart != null) {
        const endPrev = character_end_times_seconds[i - 1];
        words.push({
          word: wordChars.join(''),
          startSeconds: wordStart,
          endSeconds: endPrev,
        });
        wordChars = [];
        wordStart = null;
      }
      continue;
    }
    if (wordStart == null) wordStart = start;
    wordChars.push(ch);
  }

  if (wordChars.length > 0 && wordStart != null) {
    const lastIdx = characters.length - 1;
    words.push({
      word: wordChars.join(''),
      startSeconds: wordStart,
      endSeconds: character_end_times_seconds[lastIdx],
    });
  }
  return words;
}

/** Format seconds as SRT timestamp: HH:MM:SS,mmm */
function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/** Max characters per SRT block. 0 = one word per cue (word-by-word subtitles). */
const MAX_CHARS_PER_BLOCK = 0;

/**
 * Group words into SRT blocks (phrases) by concatenating until we exceed max chars.
 * Each block gets the start of the first word and end of the last word.
 */
export function wordsToSrtBlocks(
  words: WordTiming[],
  maxCharsPerBlock: number = MAX_CHARS_PER_BLOCK,
): { startSeconds: number; endSeconds: number; text: string }[] {
  const blocks: { startSeconds: number; endSeconds: number; text: string }[] = [];
  let currentWords: WordTiming[] = [];
  let currentLen = 0;

  for (const w of words) {
    const addLen = (currentWords.length > 0 ? 1 : 0) + w.word.length;
    if (currentLen + addLen > maxCharsPerBlock && currentWords.length > 0) {
      blocks.push({
        startSeconds: currentWords[0].startSeconds,
        endSeconds: currentWords[currentWords.length - 1].endSeconds,
        text: currentWords.map((x) => x.word).join(' '),
      });
      currentWords = [];
      currentLen = 0;
    }
    currentWords.push(w);
    currentLen += (currentWords.length > 1 ? 1 : 0) + w.word.length;
  }
  if (currentWords.length > 0) {
    blocks.push({
      startSeconds: currentWords[0].startSeconds,
      endSeconds: currentWords[currentWords.length - 1].endSeconds,
      text: currentWords.map((x) => x.word).join(' '),
    });
  }
  return blocks;
}

/** Grace period added to the last cue so it doesn't vanish instantly. */
const LAST_CUE_GRACE = 0.5;

/**
 * Build full SRT string from character alignment.
 * Uses alignment (or normalized_alignment) from ElevenLabs with-timestamps response.
 */
export function characterTimingsToSrt(alignment: CharacterAlignment): string {
  const words = charactersToWords(alignment);
  const blocks = wordsToSrtBlocks(words);

  // Close gaps: extend each cue's end to the next cue's start so subtitles never flicker off.
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].endSeconds = blocks[i + 1].startSeconds;
  }
  if (blocks.length > 0) {
    blocks[blocks.length - 1].endSeconds += LAST_CUE_GRACE;
  }

  const lines: string[] = [];
  blocks.forEach((block, index) => {
    lines.push(String(index + 1));
    lines.push(
      `${secondsToSrtTime(block.startSeconds)} --> ${secondsToSrtTime(block.endSeconds)}`,
    );
    lines.push(block.text);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}
