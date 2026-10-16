import { describe, expect, it } from 'vitest';

import { summarizeGuided, summarizeOverall, summarizeQuality } from './analytics';
import type { OverallRow, RatingRow } from './data';

function overall(npsScore: number, continueUsing: OverallRow['continueUsing'], email = 'a@x.com'): OverallRow {
  return {
    id: crypto.randomUUID(),
    userEmail: email,
    submittedAt: new Date(),
    npsScore,
    overallRating: 4,
    continueUsing,
  };
}

function rating(partial: Partial<RatingRow>): RatingRow {
  return {
    id: crypto.randomUUID(),
    userEmail: 'a@x.com',
    submittedAt: new Date(),
    source: 'Guided',
    question: 'q',
    ...partial,
  };
}

describe('summarizeOverall', () => {
  it('computes NPS as % promoters minus % detractors', () => {
    const s = summarizeOverall([
      overall(10, 'Yes'),
      overall(9, 'Yes', 'B@x.com'),
      overall(7, 'PendingImprovements', 'b@x.com'),
      overall(3, 'No'),
    ]);
    expect(s.nps).toBe(25); // (2 - 1) / 4
    expect([s.promoters, s.passives, s.detractors]).toEqual([2, 1, 1]);
    expect(s.respondents).toBe(2); // emails compared case-insensitively
    expect(s.continuePending).toBe(1);
  });

  it('reports no NPS when there are no responses', () => {
    expect(summarizeOverall([]).nps).toBeNull();
  });
});

describe('question performance', () => {
  const rows = [
    rating({ guidedQuestionNumber: 1, answered: 'Yes', accuracy: 5, usefulness: 4, completeness: 4, clarity: 5 }),
    rating({ guidedQuestionNumber: 1, answered: 'No' }),
    rating({ guidedQuestionNumber: 2, answered: 'Partially', accuracy: 2, usefulness: 2, completeness: 2, clarity: 2 }),
    rating({ source: 'Freeform', accuracy: 1, usefulness: 1, completeness: 1, clarity: 1 }),
  ];

  it('groups guided ratings by question and ignores unanswered scores', () => {
    const [q1, q2, q3] = summarizeGuided(rows, [
      { id: 'a', questionNumber: 1, topic: 'T', text: 'One?', derived: false, active: true },
      { id: 'b', questionNumber: 2, topic: 'T', text: 'Two?', derived: true, active: true },
      { id: 'c', questionNumber: 7, topic: 'T', text: 'Seven?', derived: false, active: false },
    ]);
    expect(q1).toMatchObject({ number: 1, ratings: 2, yes: 1, no: 1, score: 4.5 });
    expect(q1.averages.accuracy).toBe(5);
    expect(q2).toMatchObject({ ratings: 1, partially: 1, score: 2 });
    expect(q3).toMatchObject({ number: 7, ratings: 0, score: null, active: false });
  });

  it('combines guided and freeform for overall quality', () => {
    const q = summarizeQuality(rows);
    expect(q).toMatchObject({ ratings: 4, guided: 3, freeform: 1 });
    expect(q.answeredRate).toBeCloseTo(2 / 3);
    expect(q.averages.accuracy).toBeCloseTo((5 + 2 + 1) / 3);
  });
});
