import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AGENT_NAME, CONTINUE_USING_OPTIONS, TEXT_MAX, type ContinueUsing } from '@rayfin-app/shared';

import { ChoiceScale } from './choice-scale';
import { SubmitRow, TextArea, type SaveState } from './form-fields';
import { FIVE_POINT, NPS_SCALE } from '@/lib/scales';
import { errorMessage, submitOverall } from '@/lib/data';
import { ui } from '@/lib/ui';

export function OverallForm() {
  const [nps, setNps] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [continueUsing, setContinueUsing] = useState<ContinueUsing | null>(null);
  const [workedWell, setWorkedWell] = useState('');
  const [improvements, setImprovements] = useState('');
  const [state, setState] = useState<SaveState>({ kind: 'idle' });

  const missing = [
    nps === null && 'recommend score',
    rating === null && 'overall rating',
    continueUsing === null && 'continue using',
  ].filter((m): m is string => Boolean(m));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (missing.length > 0 || nps === null || rating === null || continueUsing === null) return;
    setState({ kind: 'saving' });
    try {
      await submitOverall({
        npsScore: nps,
        overallRating: rating,
        continueUsing,
        workedWell,
        improvements,
      });
      setState({ kind: 'saved' });
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
    }
  }

  function reset() {
    setNps(null);
    setRating(null);
    setContinueUsing(null);
    setWorkedWell('');
    setImprovements('');
    setState({ kind: 'idle' });
  }

  if (state.kind === 'saved') {
    return (
      <div className="flex flex-col items-center gap-400 py-800 text-center">
        <CheckCircle2 className="text-success icon-size-700" aria-hidden="true" />
        <div className="flex flex-col gap-200">
          <h2 className="font-heading text-600 font-semibold text-foreground">
            Thanks, your feedback is in.
          </h2>
          <p className="text-300 text-muted-foreground">
            We read every response and use it to decide what to improve next.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className={ui.button.secondary}
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-700" noValidate>
      <div className="grid gap-700 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChoiceScale
            name="nps"
            legend={`How likely are you to recommend ${AGENT_NAME} to a colleague?`}
            choices={NPS_SCALE}
            value={nps}
            onChange={setNps}
            ends={['Not at all likely', 'Extremely likely']}
          />
        </div>
        <ChoiceScale
          name="overallRating"
          legend="Overall experience"
          choices={FIVE_POINT}
          value={rating}
          onChange={setRating}
          ends={['Poor', 'Excellent']}
        />
      </div>

      <ChoiceScale
        name="continueUsing"
        legend="Would you keep using it today?"
        choices={CONTINUE_USING_OPTIONS}
        value={continueUsing}
        onChange={setContinueUsing}
        fill={false}
      />

      <div className="grid gap-500 md:grid-cols-2">
        <TextArea
          label="What worked well?"
          hint="Optional"
          value={workedWell}
          onChange={setWorkedWell}
          maxLength={TEXT_MAX}
          placeholder="Questions it handled well, time it saved you…"
        />
        <TextArea
          label="What should we improve?"
          hint="Optional"
          value={improvements}
          onChange={setImprovements}
          maxLength={TEXT_MAX}
          placeholder="Missing data, wrong answers, confusing replies…"
        />
      </div>

      <SubmitRow state={state} missing={missing} label="Submit feedback" />
    </form>
  );
}
