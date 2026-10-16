import { useState, type FormEvent } from 'react';
import { TEXT_MAX } from '@rayfin-app/shared';

import { RatingsGrid, SubmitRow, TextArea, type SaveState } from './form-fields';
import { ScreenshotField } from './screenshot-field';
import { useRatingDraft } from '@/hooks/use-rating-draft';
import { errorMessage, submitRating } from '@/lib/data';
import { pasteScreenshots } from '@/lib/screenshots';

/** "Rate an answer": the user's own question plus the four scores. */
export function QuestionForm() {
  const [question, setQuestion] = useState('');
  const draft = useRatingDraft();
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const [savedCount, setSavedCount] = useState(0);

  const missing = [...(question.trim() ? [] : ['question']), ...draft.missingRatings];

  /** Wraps a setter so starting a new entry clears the previous entry's saved/error note. */
  function edit<A extends unknown[]>(fn: (...args: A) => void) {
    return (...args: A) => {
      fn(...args);
      if (state.kind === 'saved' || state.kind === 'error') setState({ kind: 'idle' });
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missing.length > 0) return;
    const form = e.currentTarget;
    setState({ kind: 'saving' });
    try {
      await submitRating({
        source: 'Freeform',
        question,
        ratings: draft.completeRatings,
        comment: draft.comment,
        screenshots: draft.screenshots,
      });
      setQuestion('');
      draft.reset();
      setSavedCount((n) => n + 1);
      setState({ kind: 'saved' });
      form.querySelector('textarea')?.focus();
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={pasteScreenshots(draft.screenshots, edit(draft.setScreenshots))}
      className="flex flex-col gap-700"
      noValidate
    >
      <TextArea
        label="What did you ask?"
        hint="Paste or retype the question you asked"
        value={question}
        onChange={edit(setQuestion)}
        maxLength={TEXT_MAX}
        rows={2}
      />
      <RatingsGrid ratings={draft.ratings} onRate={edit(draft.rate)} />
      <TextArea
        label="Feedback"
        hint="Optional"
        value={draft.comment}
        onChange={edit(draft.setComment)}
        maxLength={TEXT_MAX}
        placeholder="Anything you'd like to tell us about this answer"
        rows={2}
      />
      <ScreenshotField
        files={draft.screenshots}
        onChange={edit(draft.setScreenshots)}
        disabled={state.kind === 'saving'}
      />
      <SubmitRow
        state={state}
        missing={missing}
        label="Submit rating"
        savedNote={
          savedCount > 1
            ? `Saved (${savedCount} this session). Rate another answer above.`
            : 'Saved. Rate another answer above.'
        }
      />
    </form>
  );
}
