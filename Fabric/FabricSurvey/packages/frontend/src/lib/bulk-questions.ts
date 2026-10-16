/**
 * Parses pasted questions for the Settings bulk upload.
 *
 * One question per line (or per comma when `splitOnCommas` is on; off by
 * default because questions often contain commas). Each line is
 *   `Topic | Question text`
 * or just `Question text`, which gets the topic "General". Leading list markers
 * such as "1.", "2)", "-" or "•" are ignored.
 */
export interface ParsedQuestion {
  topic: string;
  text: string;
}

export interface BulkResult {
  questions: ParsedQuestion[];
  skipped: { entry: string; reason: string }[];
}

export const DEFAULT_TOPIC = 'General';
const TOPIC_MAX = 100;
const QUESTION_MAX = 1000;
const LIST_MARKER = /^\s*(\d+[.)]|[-*•])\s+/;

export function parseBulkQuestions(
  input: string,
  { splitOnCommas = false, existing = [] as readonly string[] } = {}
): BulkResult {
  const seen = new Set(existing.map((t) => t.trim().toLowerCase()));
  const result: BulkResult = { questions: [], skipped: [] };
  const entries = input.split(splitOnCommas ? /\r?\n|,/ : /\r?\n/);

  for (const raw of entries) {
    const entry = raw.replace(LIST_MARKER, '').trim();
    if (!entry) continue;
    const pipe = entry.indexOf('|');
    const topic = (pipe >= 0 ? entry.slice(0, pipe).trim() : '') || DEFAULT_TOPIC;
    const text = (pipe >= 0 ? entry.slice(pipe + 1) : entry).trim();

    const reason = !text
      ? 'no question text'
      : topic.length > TOPIC_MAX
        ? `topic over ${TOPIC_MAX} characters`
        : text.length > QUESTION_MAX
          ? `question over ${QUESTION_MAX} characters`
          : seen.has(text.toLowerCase())
            ? 'already in the list'
            : null;
    if (reason) {
      result.skipped.push({ entry, reason });
      continue;
    }
    seen.add(text.toLowerCase());
    result.questions.push({ topic, text });
  }
  return result;
}
