import { useId, useState, type FormEvent } from 'react';
import { Archive, ListPlus, Pencil, Plus, RotateCcw } from 'lucide-react';
import type { GuidedQuestionRecord } from '@rayfin-app/shared';

import { LoadError, Loading, Notice } from './notice';
import { useLoad } from '@/hooks/use-load';
import { DEFAULT_TOPIC, parseBulkQuestions } from '@/lib/bulk-questions';
import { addGuidedQuestion, errorMessage, loadGuidedQuestions, updateGuidedQuestion } from '@/lib/data';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

const TOPIC_MAX = 100;
const QUESTION_MAX = 1000;


const loadAllQuestions = () => loadGuidedQuestions({ includeRetired: true });

/** Admin page for the GuidedQuestions table. */
export function QuestionSettings() {
  const { state: load, retry, setData: setQuestions } = useLoad(loadAllQuestions);
  const [error, setError] = useState<string | null>(null);

  if (load.status === 'loading') return <Loading label="Loading questions" className="h-[320px]" />;
  if (load.status === 'error') {
    return (
      <div className={ui.card}>
        <LoadError what="the questions" message={load.message} onRetry={retry} />
      </div>
    );
  }

  const questions = load.data;
  const topics = Array.from(new Set(questions.map((q) => q.topic))).sort();
  const nextNumber = questions.reduce((max, q) => Math.max(max, q.questionNumber), 0) + 1;

  async function save(q: GuidedQuestionRecord, patch: Partial<GuidedQuestionRecord>): Promise<boolean> {
    setError(null);
    try {
      await updateGuidedQuestion(q.id, patch);
      setQuestions(questions.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  const active = questions.filter((q) => q.active).length;

  return (
    <div className="flex flex-col gap-600">
      <section className={cn(ui.card, 'flex flex-col gap-500')}>
        <div className="flex flex-col gap-100">
          <h2 className="font-heading text-500 leading-500 font-bold text-foreground">Add a guided question</h2>
          <p className="text-200 text-muted-foreground">
            New questions go to the end of the Guided questions tab for everyone.
          </p>
        </div>
        <AddQuestionForm
          nextNumber={nextNumber}
          topics={topics}
          onAdded={(q) => setQuestions([...questions, q].sort((a, b) => a.questionNumber - b.questionNumber))}
        />
      </section>

      <section className={cn(ui.card, 'flex flex-col gap-500')}>
        <div className="flex flex-col gap-100">
          <h2 className="font-heading text-500 leading-500 font-bold text-foreground">Add several at once</h2>
          <p className="text-200 text-muted-foreground">
            Paste one question per line as <code>Topic | Question</code>. Lines without a topic go under
            &ldquo;{DEFAULT_TOPIC}&rdquo;.
          </p>
        </div>
        <BulkAddForm
          nextNumber={nextNumber}
          existing={questions.map((q) => q.text)}
          onAdded={(added) =>
            setQuestions([...questions, ...added].sort((a, b) => a.questionNumber - b.questionNumber))
          }
        />
      </section>

      <section className={cn(ui.card, 'flex flex-col gap-400')}>
        <div className="flex flex-col gap-100">
          <h2 className="font-heading text-500 leading-500 font-bold text-foreground">Guided questions</h2>
          <p className="text-200 text-muted-foreground">
            {active} active · {questions.length - active} retired. Retire a question instead of rewording it into a
            different one, so its past ratings keep the right label.
          </p>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {questions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-input px-400 py-800 text-center text-300 text-muted-foreground">
            No questions yet. Add the first one above.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {questions.map((q) => (
              <QuestionRow key={q.id} question={q} topics={topics} onSave={(patch) => save(q, patch)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TopicField({ value, onChange, topics }: { value: string; onChange: (v: string) => void; topics: string[] }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-100">
      <label htmlFor={id} className="text-200 font-semibold text-foreground">
        Topic
      </label>
      <input
        id={id}
        list={`${id}-topics`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={TOPIC_MAX}
        placeholder="e.g. Sales"
        className={ui.input}
        autoComplete="off"
      />
      <datalist id={`${id}-topics`}>
        {topics.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

function QuestionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-100">
      <label htmlFor={id} className="text-200 font-semibold text-foreground">
        Question
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={QUESTION_MAX}
        rows={2}
        className={cn(ui.input, 'resize-y')}
      />
    </div>
  );
}

function DerivedField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-200 text-200 text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="icon-size-200 accent-[var(--color-primary)]"
      />
      Derived (the agent has to calculate the answer)
    </label>
  );
}

function AddQuestionForm({
  nextNumber,
  topics,
  onAdded,
}: {
  nextNumber: number;
  topics: string[];
  onAdded: (q: GuidedQuestionRecord) => void;
}) {
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [derived, setDerived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = topic.trim() !== '' && text.trim() !== '';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addGuidedQuestion({ questionNumber: nextNumber, topic, text, derived, active: true });
      onAdded(created);
      setText('');
      setDerived(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-400" noValidate>
      <div className="grid gap-400 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <TopicField value={topic} onChange={setTopic} topics={topics} />
        <QuestionField value={text} onChange={setText} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-300">
        <DerivedField checked={derived} onChange={setDerived} />
        <div className="flex items-center gap-300">
          <span className="text-200 text-muted-foreground">Will be question #{nextNumber}</span>
          <button type="submit" disabled={!ready || saving} className={ui.button.primary}>
            <Plus className="icon-size-200" aria-hidden="true" />
            {saving ? 'Adding…' : 'Add question'}
          </button>
        </div>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </form>
  );
}

function BulkAddForm({
  nextNumber,
  existing,
  onAdded,
}: {
  nextNumber: number;
  existing: string[];
  onAdded: (added: GuidedQuestionRecord[]) => void;
}) {
  const [input, setInput] = useState('');
  const [splitOnCommas, setSplitOnCommas] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const inputId = useId();

  const parsed = parseBulkQuestions(input, { splitOnCommas, existing });
  const count = parsed.questions.length;
  const saving = progress !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (count === 0) return;
    setMessage(null);
    const added: GuidedQuestionRecord[] = [];
    try {
      // One at a time, so numbers stay in order and a failure stops cleanly.
      for (const [i, q] of parsed.questions.entries()) {
        setProgress(i);
        added.push(await addGuidedQuestion({ questionNumber: nextNumber + i, ...q, derived: false, active: true }));
      }
      setInput('');
      setMessage({ tone: 'success', text: `Added ${added.length} question${added.length === 1 ? '' : 's'}.` });
    } catch (err) {
      setMessage({
        tone: 'error',
        text: `Added ${added.length} of ${count}, then stopped: ${errorMessage(err)} Fix it and add the rest.`,
      });
      setInput(
        parsed.questions
          .slice(added.length)
          .map((q) => `${q.topic} | ${q.text}`)
          .join('\n')
      );
    } finally {
      if (added.length) onAdded(added);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-400" noValidate>
      <div className="flex flex-col gap-100">
        <label htmlFor={inputId} className="text-200 font-semibold text-foreground">
          Questions
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          disabled={saving}
          placeholder={'Sales | What were total sales last week?\nStores | Which stores grew the most?'}
          className={cn(ui.input, 'resize-y font-monospace')}
        />
      </div>
      <label className="flex items-center gap-200 text-200 text-foreground">
        <input
          type="checkbox"
          checked={splitOnCommas}
          onChange={(e) => setSplitOnCommas(e.target.checked)}
          className="icon-size-200 accent-[var(--color-primary)]"
        />
        Also split on commas (leave off if your questions contain commas)
      </label>

      {input.trim() ? (
        <div className="flex flex-col gap-200 rounded-lg border border-border bg-background p-400 text-200">
          <p className="font-semibold text-foreground">
            {count
              ? `${count} question${count === 1 ? '' : 's'} ready: #${nextNumber}${count > 1 ? `–#${nextNumber + count - 1}` : ''}`
              : 'Nothing to add yet'}
          </p>
          {count ? (
            <ol className="flex max-h-[220px] flex-col gap-100 overflow-auto" start={nextNumber}>
              {parsed.questions.map((q) => (
                <li key={q.text} className="flex flex-wrap items-baseline gap-200">
                  <span className={ui.chip}>{q.topic}</span>
                  <span className="text-foreground">{q.text}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {parsed.skipped.length ? (
            <div className="text-muted-foreground">
              <p className="font-semibold">Skipped {parsed.skipped.length}:</p>
              <ul className="list-disc pl-500">
                {parsed.skipped.map((s, i) => (
                  <li key={i}>
                    {s.entry.slice(0, 90)}
                    {s.entry.length > 90 ? '…' : ''}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-300">
        <div>{message ? <Notice tone={message.tone}>{message.text}</Notice> : null}</div>
        <button type="submit" disabled={count === 0 || saving} className={ui.button.primary}>
          <ListPlus className="icon-size-200" aria-hidden="true" />
          {saving ? `Adding ${progress! + 1} of ${count}…` : `Add ${count || ''} question${count === 1 ? '' : 's'}`}
        </button>
      </div>
    </form>
  );
}

function QuestionRow({
  question: q,
  topics,
  onSave,
}: {
  question: GuidedQuestionRecord;
  topics: string[];
  onSave: (patch: Partial<GuidedQuestionRecord>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [topic, setTopic] = useState(q.topic);
  const [text, setText] = useState(q.text);
  const [derived, setDerived] = useState(q.derived);
  const [saving, setSaving] = useState(false);

  async function run(patch: Partial<GuidedQuestionRecord>) {
    setSaving(true);
    const ok = await onSave(patch);
    setSaving(false);
    return ok;
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-300 bg-background p-400">
        <p className="text-200 font-semibold text-muted-foreground">Editing question #{q.questionNumber}</p>
        <div className="grid gap-400 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <TopicField value={topic} onChange={setTopic} topics={topics} />
          <QuestionField value={text} onChange={setText} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-300">
          <DerivedField checked={derived} onChange={setDerived} />
          <div className="flex items-center gap-200">
            <button
              type="button"
              className={ui.button.quiet}
              disabled={saving}
              onClick={() => {
                setTopic(q.topic);
                setText(q.text);
                setDerived(q.derived);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={ui.button.primary}
              disabled={saving || !topic.trim() || !text.trim()}
              onClick={async () => {
                if (await run({ topic: topic.trim(), text: text.trim(), derived })) setEditing(false);
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={cn('flex flex-wrap items-start gap-300 p-400', !q.active && 'opacity-60')}>
      <span className="w-600 shrink-0 pt-100 font-numeric text-300 text-muted-foreground">{q.questionNumber}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-100">
        <div className="flex flex-wrap items-center gap-200">
          <span className="rounded-full bg-accent px-200 py-100 text-100 font-semibold text-accent-foreground">
            {q.topic}
          </span>
          {q.derived ? (
            <span className="rounded-full border border-border px-200 py-100 text-100 text-muted-foreground">
              Derived
            </span>
          ) : null}
          {!q.active ? (
            <span className="rounded-full bg-muted px-200 py-100 text-100 font-semibold text-muted-foreground">
              Retired
            </span>
          ) : null}
        </div>
        <p className="text-300 text-foreground">{q.text}</p>
      </div>
      <div className="flex shrink-0 items-center gap-100">
        <button type="button" className={ui.button.quiet} disabled={saving} onClick={() => setEditing(true)}>
          <Pencil className="icon-size-200" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className={ui.button.quiet}
          disabled={saving}
          onClick={() => void run({ active: !q.active })}
        >
          {q.active ? (
            <Archive className="icon-size-200" aria-hidden="true" />
          ) : (
            <RotateCcw className="icon-size-200" aria-hidden="true" />
          )}
          {q.active ? 'Retire' : 'Restore'}
        </button>
      </div>
    </li>
  );
}
