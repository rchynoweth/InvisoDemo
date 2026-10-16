/**
 * Every read and write the app makes: the three tables and the screenshot
 * upload function. Components call these and never touch the client directly.
 *
 * Access rules live on the server (see packages/data): users create and read
 * their own feedback, admins read everything and manage the guided questions.
 */
import type {
  Answered,
  ContinueUsing,
  GuidedQuestionRecord,
  OverallFeedbackRecord,
  QuestionFeedbackRecord,
  ResponseDimension,
} from '@rayfin-app/shared';

import { getRayfinClient } from '@/lib/rayfin-client';
import { screenshotBase64 } from '@/lib/screenshots';

const PAGE = 500;

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
}

/** Empty free text is stored as NULL rather than '' so analytics can count real answers. */
function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Who and when, from the signed-in session; the row policy rejects any other owner. */
async function signedIn() {
  const client = await getRayfinClient();
  const user = client.auth.getSession()?.user;
  if (!user) throw new Error('Your session has ended. Reload the page to sign in again.');
  return { client, user, stamp: { owner_id: user.id, userEmail: user.email, submittedAt: new Date() } };
}

/** Pages through a query until the server says there is nothing left. */
async function fetchAll<T>(
  page: (after?: string) => { executePaginated(): Promise<{ items: unknown[]; hasNextPage: boolean; endCursor?: string | null }> }
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | undefined;
  do {
    const result = await page(cursor).executePaginated();
    rows.push(...(result.items as T[]));
    cursor = result.hasNextPage ? (result.endCursor ?? undefined) : undefined;
  } while (cursor);
  return rows;
}

// ---------- feedback ----------

export async function submitOverall(input: {
  npsScore: number;
  overallRating: number;
  continueUsing: ContinueUsing;
  workedWell: string;
  improvements: string;
}): Promise<void> {
  const { client, stamp } = await signedIn();
  await client.data.OverallFeedback.create({
    ...stamp,
    ...input,
    workedWell: optionalText(input.workedWell),
    improvements: optionalText(input.improvements),
  });
}

export interface RatingInput {
  source: 'Guided' | 'Freeform';
  /** GuidedQuestion.questionNumber, for guided ratings. */
  guidedQuestionNumber?: number;
  question: string;
  answered?: Answered;
  /** Omitted when a guided question wasn't answered. */
  ratings?: Record<ResponseDimension, number>;
  agentResponse?: string;
  comment: string;
  screenshots: readonly File[];
}

/** Files already uploaded, so a retry after a failed save doesn't store them twice. */
const uploaded = new WeakMap<File, string>();

async function uploadScreenshots(files: readonly File[]): Promise<string | undefined> {
  if (files.length === 0) return undefined;
  const client = await getRayfinClient();
  const paths: string[] = [];
  for (const file of files) {
    let path = uploaded.get(file);
    if (!path) {
      const result = await client.functions.uploadScreenshot.invoke(
        { dataBase64: await screenshotBase64(file) },
        { timeoutMs: 60_000 }
      );
      if (!result.ok || !result.path) throw new Error(result.error ?? "Couldn't save a screenshot. Please try again.");
      path = result.path;
      uploaded.set(file, path);
    }
    paths.push(path);
  }
  return paths.join('\n');
}

/** Saves one answer rating (guided or freeform), uploading its screenshots first. */
export async function submitRating({ screenshots, ratings, ...input }: RatingInput): Promise<void> {
  const paths = await uploadScreenshots(screenshots);
  const { client, stamp } = await signedIn();
  await client.data.QuestionFeedback.create({
    ...stamp,
    ...input,
    ...ratings,
    question: input.question.trim(),
    agentResponse: optionalText(input.agentResponse),
    comment: optionalText(input.comment),
    screenshots: paths,
  });
}

/** Guided question numbers this user has already rated, so they can pick up where they left off. */
export async function myRatedQuestionNumbers(): Promise<Set<number>> {
  const { client, user } = await signedIn();
  // Admins can read everyone's rows, so scope to the caller explicitly.
  const rows = await fetchAll<{ guidedQuestionNumber?: number }>((after) => {
    const q = client.data.QuestionFeedback.select(['guidedQuestionNumber'])
      .where({ source: { eq: 'Guided' }, owner_id: { eq: user.id } })
      .orderBy({ submittedAt: 'asc' })
      .first(PAGE);
    return after ? q.after(after) : q;
  });
  return new Set(rows.map((r) => r.guidedQuestionNumber).filter((n): n is number => typeof n === 'number'));
}

// ---------- guided questions ----------

const QUESTION_FIELDS = ['id', 'questionNumber', 'topic', 'text', 'derived', 'active'] as const;

/** In questionNumber order. Analytics and Settings want retired ones too. */
export async function loadGuidedQuestions({ includeRetired = false } = {}): Promise<GuidedQuestionRecord[]> {
  const client = await getRayfinClient();
  return fetchAll<GuidedQuestionRecord>((after) => {
    let q = client.data.GuidedQuestion.select([...QUESTION_FIELDS]).orderBy({ questionNumber: 'asc' }).first(PAGE);
    if (!includeRetired) q = q.where({ active: { eq: true } });
    return after ? q.after(after) : q;
  });
}

export type GuidedQuestionInput = Omit<GuidedQuestionRecord, 'id'>;

/** Admin only: the server's write policy rejects everyone else. */
export async function addGuidedQuestion(input: GuidedQuestionInput): Promise<GuidedQuestionRecord> {
  const client = await getRayfinClient();
  return (await client.data.GuidedQuestion.create({
    ...input,
    topic: input.topic.trim(),
    text: input.text.trim(),
  })) as GuidedQuestionRecord;
}

/** Admin only. questionNumber can't change: ratings join on it. */
export async function updateGuidedQuestion(
  id: string,
  patch: Partial<Omit<GuidedQuestionInput, 'questionNumber'>>
): Promise<void> {
  const client = await getRayfinClient();
  await client.data.GuidedQuestion.update({ id }, patch);
}

// ---------- analytics ----------

const OVERALL_FIELDS = [
  'id', 'userEmail', 'submittedAt', 'npsScore', 'overallRating', 'continueUsing', 'workedWell', 'improvements',
] as const;

const RATING_FIELDS = [
  'id', 'userEmail', 'submittedAt', 'source', 'guidedQuestionNumber', 'question', 'answered',
  'accuracy', 'usefulness', 'completeness', 'clarity', 'agentResponse', 'comment', 'screenshots',
] as const;

export type OverallRow = Pick<OverallFeedbackRecord, (typeof OVERALL_FIELDS)[number]>;
export type RatingRow = Pick<QuestionFeedbackRecord, (typeof RATING_FIELDS)[number]>;

export interface AnalyticsData {
  overall: OverallRow[];
  ratings: RatingRow[];
  guidedQuestions: GuidedQuestionRecord[];
}

/**
 * Every row in both feedback tables, newest first, plus all guided questions.
 * The server's read policy decides what "every" means: admins get all rows.
 */
export async function loadAnalytics(): Promise<AnalyticsData> {
  const client = await getRayfinClient();
  const [overall, ratings, guidedQuestions] = await Promise.all([
    fetchAll<OverallRow>((after) => {
      const q = client.data.OverallFeedback.select([...OVERALL_FIELDS]).orderBy({ submittedAt: 'desc' }).first(PAGE);
      return after ? q.after(after) : q;
    }),
    fetchAll<RatingRow>((after) => {
      const q = client.data.QuestionFeedback.select([...RATING_FIELDS]).orderBy({ submittedAt: 'desc' }).first(PAGE);
      return after ? q.after(after) : q;
    }),
    loadGuidedQuestions({ includeRetired: true }),
  ]);
  return { overall, ratings, guidedQuestions };
}
