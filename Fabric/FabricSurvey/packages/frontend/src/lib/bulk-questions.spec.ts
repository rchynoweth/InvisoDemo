import { describe, expect, it } from 'vitest';

import { parseBulkQuestions } from './bulk-questions';

describe('parseBulkQuestions', () => {
  it('reads "Topic | Question" lines and keeps commas inside questions', () => {
    const r = parseBulkQuestions('Sales | What were sales yesterday, last week, or last month?\nStores | Which stores grew?');
    expect(r.questions).toEqual([
      { topic: 'Sales', text: 'What were sales yesterday, last week, or last month?' },
      { topic: 'Stores', text: 'Which stores grew?' },
    ]);
  });

  it('files lines without a topic under General', () => {
    expect(parseBulkQuestions('Which stores grew?\n | No topic either?').questions).toEqual([
      { topic: 'General', text: 'Which stores grew?' },
      { topic: 'General', text: 'No topic either?' },
    ]);
  });

  it('splits on commas only when asked', () => {
    const r = parseBulkQuestions('T | First?, T | Second?', { splitOnCommas: true });
    expect(r.questions.map((q) => q.text)).toEqual(['First?', 'Second?']);
  });

  it('strips list markers and skips blanks and duplicates', () => {
    const r = parseBulkQuestions('1. T | Existing?\n\n- T | New one?\n2) T | New one?\nT |', {
      existing: ['existing?'],
    });
    expect(r.questions).toEqual([{ topic: 'T', text: 'New one?' }]);
    expect(r.skipped.map((s) => s.reason)).toEqual(['already in the list', 'already in the list', 'no question text']);
  });
});
