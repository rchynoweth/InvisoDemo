/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */

/**
 * Who can open Analytics and Settings is configured per deployment, not in code:
 * set `RAYFIN_PUBLIC_ANALYTICS_ADMINS=a@x.com,b@y.com` in `rayfin/.env` (git-ignored)
 * and redeploy with `npx rayfin up`. The data package reads it for the server-side
 * policies; the frontend reads it as `VITE_RAYFIN_ANALYTICS_ADMINS`.
 */
export const ADMINS_ENV = 'RAYFIN_PUBLIC_ANALYTICS_ADMINS';

/** "A@x.com, b@y.com" -> ['a@x.com', 'b@y.com']. */
export function parseAdmins(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'));
}

export function isAnalyticsAdmin(email: string | null | undefined, admins: readonly string[]): boolean {
  return !!email && admins.includes(email.toLowerCase());
}

/**
 * The data agent this app collects feedback on, as users see it. Change it here
 * (and the page title in packages/frontend/index.html) to reuse the app for
 * another agent.
 */
export const AGENT_NAME = 'Promotion Intelligence';

export const TEXT_MAX = 2000;

/** Screenshots per rating; each is saved to the screenshots Lakehouse by the uploadScreenshot function. */
export const MAX_SCREENSHOTS = 3;

/** Where uploaded screenshots live, for linking from the Analytics view. */
export const SCREENSHOT_LAKEHOUSE = {
  name: 'PromotionIntelligenceFeedback_LH',
  folder: 'Files/screenshots',
  portalUrl:
    'https://app.fabric.microsoft.com/groups/d099e005-e033-42c6-bb60-00071d466680/lakehouses/519a5978-a8dd-454f-b072-980c764fb255',
} as const;
export const RESPONSE_MAX = 4000;

export const CONTINUE_USING_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'PendingImprovements', label: 'Yes, pending improvements' },
  { value: 'No', label: 'No' },
] as const;

export type ContinueUsing = (typeof CONTINUE_USING_OPTIONS)[number]['value'];

export const RESPONSE_DIMENSIONS = [
  { key: 'accuracy', label: 'Accuracy', hint: 'Were the numbers and facts right?' },
  { key: 'usefulness', label: 'Business usefulness', hint: 'Could you act on it?' },
  { key: 'completeness', label: 'Completeness', hint: 'Did it answer the whole question?' },
  { key: 'clarity', label: 'Clarity', hint: 'Was it easy to understand?' },
] as const;

export type ResponseDimension = (typeof RESPONSE_DIMENSIONS)[number]['key'];

export type QuestionSource = 'Freeform' | 'Guided';

export const ANSWERED_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'Partially', label: 'Partially' },
  { value: 'No', label: 'No' },
] as const;

export type Answered = (typeof ANSWERED_OPTIONS)[number]['value'];

export interface GuidedQuestionRecord {
  id: string;
  /** Stable key and display order; QuestionFeedback.guidedQuestionNumber joins to it. */
  questionNumber: number;
  topic: string;
  text: string;
  /** True when the agent has to calculate the answer rather than look it up. */
  derived: boolean;
  /** Retired questions stay for history but leave the guided list. */
  active: boolean;
}

export interface OverallFeedbackRecord {
  id: string;
  owner_id: string;
  userEmail: string;
  submittedAt: Date;
  npsScore: number;
  overallRating: number;
  continueUsing: ContinueUsing;
  workedWell?: string;
  improvements?: string;
}

export interface QuestionFeedbackRecord {
  id: string;
  owner_id: string;
  userEmail: string;
  submittedAt: Date;
  source: QuestionSource;
  guidedQuestionNumber?: number;
  question: string;
  answered?: Answered;
  accuracy?: number;
  usefulness?: number;
  completeness?: number;
  clarity?: number;
  agentResponse?: string;
  comment?: string;
  /** Lakehouse-relative paths (Files/screenshots/...), one per line. */
  screenshots?: string;
}

export type UniversalAppSchema = {
  GuidedQuestion: GuidedQuestionRecord;
  OverallFeedback: OverallFeedbackRecord;
  QuestionFeedback: QuestionFeedbackRecord;
};
