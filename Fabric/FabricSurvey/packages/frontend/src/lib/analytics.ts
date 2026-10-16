/** Pure summaries and formatting for the Analytics view; loading lives in lib/data. */
import { RESPONSE_DIMENSIONS, type GuidedQuestionRecord, type ResponseDimension } from '@rayfin-app/shared';

import type { OverallRow, RatingRow } from '@/lib/data';

/** Mean of the finite numbers in `values`, or null when there are none. */
export function mean(values: readonly (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export interface OverallSummary {
  responses: number;
  respondents: number;
  nps: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  avgRating: number | null;
  continueYes: number;
  continuePending: number;
  continueNo: number;
}

export function summarizeOverall(rows: readonly OverallRow[]): OverallSummary {
  const promoters = rows.filter((r) => r.npsScore >= 9).length;
  const detractors = rows.filter((r) => r.npsScore <= 6).length;
  return {
    responses: rows.length,
    respondents: new Set(rows.map((r) => r.userEmail.toLowerCase())).size,
    nps: rows.length ? Math.round(((promoters - detractors) / rows.length) * 100) : null,
    promoters,
    passives: rows.length - promoters - detractors,
    detractors,
    avgRating: mean(rows.map((r) => r.overallRating)),
    continueYes: rows.filter((r) => r.continueUsing === 'Yes').length,
    continuePending: rows.filter((r) => r.continueUsing === 'PendingImprovements').length,
    continueNo: rows.filter((r) => r.continueUsing === 'No').length,
  };
}

export type DimensionAverages = Record<ResponseDimension, number | null>;

function dimensionAverages(rows: readonly RatingRow[]): DimensionAverages {
  return Object.fromEntries(
    RESPONSE_DIMENSIONS.map((d) => [d.key, mean(rows.map((r) => r[d.key]))])
  ) as DimensionAverages;
}

/** Average of the four dimension averages, i.e. one "answer quality" number. */
export function overallScore(avgs: DimensionAverages): number | null {
  return mean(Object.values(avgs));
}

export interface QuestionPerformance {
  number: number;
  topic: string;
  text: string;
  derived: boolean;
  active: boolean;
  ratings: number;
  yes: number;
  partially: number;
  no: number;
  averages: DimensionAverages;
  score: number | null;
}

/** One row per question in the GuidedQuestions table, joined to ratings on questionNumber. */
export function summarizeGuided(
  rows: readonly RatingRow[],
  guidedQuestions: readonly GuidedQuestionRecord[]
): QuestionPerformance[] {
  return guidedQuestions.map((q) => {
    const number = q.questionNumber;
    const mine = rows.filter((r) => r.source === 'Guided' && r.guidedQuestionNumber === number);
    const averages = dimensionAverages(mine);
    return {
      number,
      topic: q.topic,
      text: q.text,
      derived: !!q.derived,
      active: q.active !== false,
      ratings: mine.length,
      yes: mine.filter((r) => r.answered === 'Yes').length,
      partially: mine.filter((r) => r.answered === 'Partially').length,
      no: mine.filter((r) => r.answered === 'No').length,
      averages,
      score: overallScore(averages),
    };
  });
}

export interface QualitySummary {
  ratings: number;
  guided: number;
  freeform: number;
  answeredRate: number | null;
  averages: DimensionAverages;
  score: number | null;
}

export function summarizeQuality(rows: readonly RatingRow[]): QualitySummary {
  const guided = rows.filter((r) => r.source === 'Guided');
  const answered = guided.filter((r) => r.answered === 'Yes' || r.answered === 'Partially');
  const averages = dimensionAverages(rows);
  return {
    ratings: rows.length,
    guided: guided.length,
    freeform: rows.length - guided.length,
    answeredRate: guided.length ? answered.length / guided.length : null,
    averages,
    score: overallScore(averages),
  };
}

// ---------- formatting & export ----------

export function fmtScore(value: number | null): string {
  return value === null ? '–' : value.toFixed(1);
}

export function fmtPct(value: number | null): string {
  return value === null ? '–' : `${Math.round(value * 100)}%`;
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function fmtDate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? '–' : dateTime.format(d);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(
  filename: string,
  columns: readonly { key: string; label: string }[],
  rows: readonly Record<string, unknown>[]
): void {
  const lines = [
    columns.map((c) => csvCell(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(',')),
  ];
  // Leading BOM so Excel opens the UTF-8 file with the right encoding.
  const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
