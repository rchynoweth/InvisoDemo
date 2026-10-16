import { useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Copy, PartyPopper } from 'lucide-react';
import {
  AGENT_NAME,
  ANSWERED_OPTIONS,
  RESPONSE_MAX,
  TEXT_MAX,
  type Answered,
  type GuidedQuestionRecord,
} from '@rayfin-app/shared';

import { ChoiceScale } from './choice-scale';
import { RatingsGrid, SubmitRow, TextArea, type SaveState } from './form-fields';
import { LoadError, Loading } from './notice';
import { ScreenshotField } from './screenshot-field';
import { useLoad } from '@/hooks/use-load';
import { useRatingDraft } from '@/hooks/use-rating-draft';
import { errorMessage, loadGuidedQuestions, myRatedQuestionNumbers, submitRating } from '@/lib/data';
import { pasteScreenshots } from '@/lib/screenshots';
import { ui } from '@/lib/ui';

/** Active questions plus what this user already rated. Progress is optional; the questions are not. */
async function loadGuided() {
  const [questions, progress] = await Promise.allSettled([loadGuidedQuestions(), myRatedQuestionNumbers()]);
  if (questions.status === 'rejected') throw questions.reason;
  return {
    questions: questions.value,
    rated: progress.status === 'fulfilled' ? progress.value : new Set<number>(),
    progressFailed: progress.status === 'rejected',
  };
}

export function GuidedForm() {
  const { state: load, retry } = useLoad(loadGuided);
  if (load.status === 'loading') return <Loading label="Loading the questions" />;
  if (load.status === 'error') return <LoadError what="the guided questions" message={load.message} onRetry={retry} />;

  const { questions, rated, progressFailed } = load.data;
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-200 rounded-lg border border-dashed border-input px-600 py-800 text-center">
        <p className="text-400 font-semibold text-foreground">No guided questions yet</p>
        <p className="max-w-md text-300 text-muted-foreground">
          An administrator needs to add questions in Settings. Until then, use the Rate an answer tab.
        </p>
      </div>
    );
  }
  return <GuidedSteps questions={questions} initiallyRated={rated} progressFailed={progressFailed} />;
}

function GuidedSteps({
  questions,
  initiallyRated,
  progressFailed,
}: {
  questions: GuidedQuestionRecord[];
  initiallyRated: Set<number>;
  progressFailed: boolean;
}) {
  const firstUnrated = (rated: Set<number>) => Math.max(0, questions.findIndex((q) => !rated.has(q.questionNumber)));

  const [rated, setRated] = useState(initiallyRated);
  const [index, setIndex] = useState(() => firstUnrated(initiallyRated));
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const draft = useRatingDraft();

  const total = questions.length;
  const ratedCount = questions.filter((q) => rated.has(q.questionNumber)).length;

  function goTo(next: number) {
    setIndex(next);
    setAnswered(null);
    setResponse('');
    setCopied(false);
    setState({ kind: 'idle' });
    draft.reset();
  }

  if (index >= total) {
    return (
      <div className="flex flex-col items-center gap-400 py-800 text-center">
        <PartyPopper className="text-primary icon-size-700" aria-hidden="true" />
        <div className="flex flex-col gap-200">
          <h2 className="font-heading text-600 font-semibold text-foreground">That's the whole list. Thank you!</h2>
          <p className="text-300 text-muted-foreground">
            You've rated {ratedCount} of {total} questions.
          </p>
        </div>
        <button type="button" onClick={() => goTo(firstUnrated(rated))} className={ui.button.secondary}>
          {ratedCount < total ? 'Go to the questions you skipped' : 'Start again from the first question'}
        </button>
      </div>
    );
  }

  const current = questions[index];
  const needsRatings = answered === 'Yes' || answered === 'Partially';
  const missing = [...(answered ? [] : ['did it answer']), ...(needsRatings ? draft.missingRatings : [])];
  const saving = state.kind === 'saving';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (missing.length > 0 || !answered) return;
    setState({ kind: 'saving' });
    try {
      await submitRating({
        source: 'Guided',
        guidedQuestionNumber: current.questionNumber,
        question: current.text,
        answered,
        ratings: needsRatings ? draft.completeRatings : undefined,
        agentResponse: response,
        comment: draft.comment,
        screenshots: draft.screenshots,
      });
      setRated((r) => new Set(r).add(current.questionNumber));
      goTo(index + 1);
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={pasteScreenshots(draft.screenshots, draft.setScreenshots)}
      className="flex flex-col gap-700"
      noValidate
    >
      <div className="flex flex-col gap-300">
        <div className="flex flex-wrap items-center justify-between gap-200 text-200">
          <p className="flex items-center gap-200 font-semibold text-foreground">
            Question {index + 1} of {total}
            <span className={ui.chip}>{current.topic}</span>
            {rated.has(current.questionNumber) ? (
              <span className="flex items-center gap-100 text-success">
                <CheckCircle2 className="icon-size-200" aria-hidden="true" />
                Already rated
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground">
            {ratedCount} of {total} done
          </p>
        </div>
        <div
          className="h-200 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Questions completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={ratedCount}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(ratedCount / total) * 100}%` }} />
        </div>
        {progressFailed ? (
          <p className="text-200 text-muted-foreground">
            Couldn't load your earlier progress, so we've started at the first question.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-400 rounded-xl border border-inviso-tint-200 bg-inviso-tint-gradient p-500 dark:border-border dark:bg-none dark:bg-accent">
        <p className="text-200 font-semibold uppercase tracking-wider text-accent-foreground">Ask {AGENT_NAME}</p>
        <p className="font-heading text-500 leading-500 font-semibold text-foreground">{current.text}</p>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(current.text).then(
              () => setCopied(true),
              () => {} // Clipboard blocked (e.g. in an iframe); the text is selectable anyway.
            )
          }
          className="flex items-center gap-200 self-start rounded-lg bg-card px-300 py-200 text-200 font-semibold text-primary shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check className="icon-size-200" aria-hidden="true" /> : <Copy className="icon-size-200" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy question'}
        </button>
      </div>

      <ChoiceScale
        name="answered"
        legend="Did it answer the question?"
        choices={ANSWERED_OPTIONS}
        value={answered}
        onChange={setAnswered}
        fill={false}
      />

      {needsRatings ? <RatingsGrid ratings={draft.ratings} onRate={draft.rate} /> : null}

      <div className="grid gap-500 md:grid-cols-2">
        <TextArea
          label="Paste the agent's response"
          hint="Optional, but it helps us check the answer"
          value={response}
          onChange={setResponse}
          maxLength={RESPONSE_MAX}
        />
        <TextArea
          label="Feedback"
          hint="Optional"
          value={draft.comment}
          onChange={draft.setComment}
          maxLength={TEXT_MAX}
          placeholder="Anything you'd like to tell us about this answer"
        />
      </div>

      <ScreenshotField files={draft.screenshots} onChange={draft.setScreenshots} disabled={saving} />

      <SubmitRow
        state={state}
        missing={missing}
        label={index === total - 1 ? 'Save & finish' : 'Save & next'}
      >
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0 || saving} className={ui.button.secondary}>
          Back
        </button>
        <button type="button" onClick={() => goTo(index + 1)} disabled={saving} className={ui.button.quiet}>
          Skip
        </button>
      </SubmitRow>
    </form>
  );
}
