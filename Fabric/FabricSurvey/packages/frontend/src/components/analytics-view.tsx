import { useMemo, useState, type ReactNode } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import {
  CONTINUE_USING_OPTIONS,
  RESPONSE_DIMENSIONS,
  SCREENSHOT_LAKEHOUSE,
} from '@rayfin-app/shared';

import { LoadError, Loading } from './notice';
import { useLoad } from '@/hooks/use-load';
import {
  downloadCsv,
  fmtDate,
  fmtPct,
  fmtScore,
  summarizeGuided,
  summarizeOverall,
  summarizeQuality,
  type QuestionPerformance,
} from '@/lib/analytics';
import { loadAnalytics, type AnalyticsData, type OverallRow, type RatingRow } from '@/lib/data';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

const card = ui.card;
const smallButton = cn(ui.button.secondary, 'px-300 text-[length:var(--text-200)]');

export function AnalyticsView() {
  const { state, retry } = useLoad(loadAnalytics);
  if (state.status === 'loading') return <Loading label="Loading analytics" className="h-[480px] rounded-2xl" />;
  if (state.status === 'error') {
    return (
      <div className={card}>
        <LoadError what="the feedback data" message={state.message} onRetry={retry} />
      </div>
    );
  }
  return <AnalyticsContent {...state.data} onRefresh={retry} />;
}

function AnalyticsContent({
  overall,
  ratings,
  guidedQuestions,
  onRefresh,
}: AnalyticsData & { onRefresh: () => void }) {
  const o = useMemo(() => summarizeOverall(overall), [overall]);
  const q = useMemo(() => summarizeQuality(ratings), [ratings]);
  const perQuestion = useMemo(
    () => summarizeGuided(ratings, guidedQuestions),
    [ratings, guidedQuestions],
  );
  const activeCount = guidedQuestions.filter((g) => g.active !== false).length;

  return (
    <div className="flex flex-col gap-700">
      <div className="flex flex-wrap items-center justify-between gap-300">
        <p className="text-200 text-inviso-tint-200">
          {o.responses} overall responses · {q.ratings} answer ratings
        </p>
        <button type="button" onClick={onRefresh} className={smallButton}>
          <RefreshCw className="icon-size-200" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <Section
        title="Overall performance"
        subtitle="From the Overall feedback tab"
      >
        <div className="grid grid-cols-2 gap-400 lg:grid-cols-4">
          <StatTile
            label="Net Promoter Score"
            value={
              o.nps === null ? '–' : o.nps > 0 ? `+${o.nps}` : String(o.nps)
            }
            note="−100 to +100"
          />
          <StatTile
            label="Overall experience"
            value={fmtScore(o.avgRating)}
            note="average out of 5"
          />
          <StatTile
            label="Would keep using"
            value={fmtPct(
              o.responses
                ? (o.continueYes + o.continuePending) / o.responses
                : null,
            )}
            note="yes, or yes pending improvements"
          />
          <StatTile
            label="Responses"
            value={String(o.responses)}
            note={`from ${o.respondents} people`}
          />
        </div>
        <div className="grid gap-600 lg:grid-cols-2">
          <BreakdownBar
            title="How likely to recommend"
            total={o.responses}
            parts={[
              {
                label: 'Detractors (0–6)',
                count: o.detractors,
                className: 'bg-detractor',
              },
              {
                label: 'Passives (7–8)',
                count: o.passives,
                className: 'bg-passive',
              },
              {
                label: 'Promoters (9–10)',
                count: o.promoters,
                className: 'bg-promoter',
              },
            ]}
          />
          <BreakdownBar
            title="Would you keep using it today?"
            total={o.responses}
            parts={[
              { label: 'No', count: o.continueNo, className: 'bg-detractor' },
              {
                label: CONTINUE_USING_OPTIONS[1].label,
                count: o.continuePending,
                className: 'bg-passive',
              },
              { label: 'Yes', count: o.continueYes, className: 'bg-promoter' },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Answer quality"
        subtitle="Guided questions and Rate an answer, combined"
      >
        <div className="grid gap-600 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="grid grid-cols-2 gap-400">
            <StatTile
              label="Quality score"
              value={fmtScore(q.score)}
              note="average of the 4 scores, out of 5"
            />
            <StatTile
              label="Answered"
              value={fmtPct(q.answeredRate)}
              note="guided questions answered fully or partly"
            />
            <StatTile
              label="Guided ratings"
              value={String(q.guided)}
              note={`across ${activeCount} active guided questions`}
            />
            <StatTile
              label="Freeform ratings"
              value={String(q.freeform)}
              note="users' own questions"
            />
          </div>
          <div className="flex flex-col gap-400 rounded-xl border border-border p-500">
            <p className="text-300 font-semibold text-foreground">
              Average score by dimension
            </p>
            {RESPONSE_DIMENSIONS.map((d) => (
              <div
                key={d.key}
                className="grid grid-cols-[140px_minmax(0,1fr)_40px] items-center gap-300"
              >
                <span className="text-200 text-foreground">{d.label}</span>
                <ScoreBar value={q.averages[d.key]} label={d.label} />
                <span className="text-right font-numeric text-300 font-semibold text-foreground">
                  {fmtScore(q.averages[d.key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Question by question" subtitle={`Every question in the GuidedQuestions table (${activeCount} active)`}>
        <QuestionTable rows={perQuestion} />
      </Section>

      <Section title="Responses" subtitle="Every row in both tables">
        <ResponseTables overall={overall} questions={ratings} />
      </Section>
    </div>
  );
}

// ---------- building blocks ----------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(card, 'flex flex-col gap-500')}>
      <div className="flex flex-col gap-100">
        <h2 className="font-heading text-500 leading-500 font-bold text-foreground">
          {title}
        </h2>
        <p className="text-200 text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-100 rounded-xl border border-border bg-background p-400">
      <span className="text-200 font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="font-numeric text-hero-800 leading-hero-800 font-bold text-foreground">
        {value}
      </span>
      <span className="text-200 text-muted-foreground">{note}</span>
    </div>
  );
}

/** Single-hue magnitude bar for a 1–5 average. */
function ScoreBar({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      className="h-300 overflow-hidden rounded-full bg-muted"
      title={
        value === null
          ? `${label}: no ratings yet`
          : `${label}: ${value.toFixed(2)} out of 5`
      }
    >
      {value !== null ? (
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      ) : null}
    </div>
  );
}

interface Part {
  label: string;
  count: number;
  className: string;
}

/** 100% stacked bar with a text legend (counts and percents), so colour is never the only cue. */
function BreakdownBar({
  title,
  total,
  parts,
}: {
  title: string;
  total: number;
  parts: Part[];
}) {
  return (
    <div className="flex flex-col gap-300">
      <p className="text-300 font-semibold text-foreground">{title}</p>
      <StackedBar total={total} parts={parts} tall />
      <ul className="flex flex-wrap gap-x-500 gap-y-200 text-200">
        {parts.map((p) => (
          <li
            key={p.label}
            className="flex items-center gap-200 text-foreground"
          >
            <span
              aria-hidden="true"
              className={cn('h-300 w-300 rounded-sm', p.className)}
            />
            {p.label}
            <span className="text-muted-foreground">
              {p.count} · {total ? fmtPct(p.count / total) : '–'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StackedBar({
  total,
  parts,
  tall,
}: {
  total: number;
  parts: Part[];
  tall?: boolean;
}) {
  if (!total) {
    return (
      <div
        className={cn('rounded-full bg-muted', tall ? 'h-500' : 'h-300')}
        title="No responses yet"
      />
    );
  }
  return (
    <div
      className={cn(
        'flex gap-[2px] overflow-hidden rounded-full',
        tall ? 'h-500' : 'h-300',
      )}
    >
      {parts
        .filter((p) => p.count > 0)
        .map((p) => (
          <div
            key={p.label}
            className={cn(
              'h-full first:rounded-l-full last:rounded-r-full',
              p.className,
            )}
            style={{ width: `${(p.count / total) * 100}%` }}
            title={`${p.label}: ${p.count} (${fmtPct(p.count / total)})`}
          />
        ))}
    </div>
  );
}

const th =
  'whitespace-nowrap px-300 py-200 text-left text-[length:var(--text-200)] font-semibold text-muted-foreground';
const td = 'px-300 py-300 align-top text-[length:var(--text-200)] text-foreground';

function QuestionTable({ rows }: { rows: QuestionPerformance[] }) {
  const [sort, setSort] = useState<'order' | 'lowest'>('order');
  const sorted = useMemo(() => {
    if (sort === 'order') return rows;
    // Lowest score first; unrated questions go last.
    return [...rows].sort((a, b) => (a.score ?? 99) - (b.score ?? 99));
  }, [rows, sort]);

  return (
    <div className="flex flex-col gap-300">
      <div className="flex flex-wrap items-center gap-200 text-200">
        <span className="text-muted-foreground">Sort by</span>
        {(
          [
            ['order', 'Question order'],
            ['lowest', 'Lowest score first'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => setSort(id)}
            className={cn(
              'rounded-full border px-300 py-100 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              sort === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-foreground hover:bg-accent',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[960px] border-collapse">
          <thead className="bg-background">
            <tr className="border-b border-border">
              <th className={th}>#</th>
              <th className={cn(th, 'min-w-[360px]')}>Question</th>
              <th className={cn(th, 'text-right')}>Ratings</th>
              <th className={cn(th, 'w-[180px]')}>
                Answered (yes · partly · no)
              </th>
              {RESPONSE_DIMENSIONS.map((d) => (
                <th key={d.key} className={cn(th, 'text-right')}>
                  {d.label === 'Business usefulness' ? 'Usefulness' : d.label}
                </th>
              ))}
              <th className={cn(th, 'min-w-[160px]')}>Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.number}
                className="border-b border-border last:border-b-0 hover:bg-hover"
              >
                <td className={cn(td, 'font-numeric text-muted-foreground')}>
                  {r.number}
                </td>
                <td className={td}>
                  <span className="mr-200 rounded-full bg-accent px-200 py-100 text-100 font-semibold text-accent-foreground">
                    {r.topic}
                  </span>
                  {r.text}
                  {!r.active ? (
                    <span className="ml-200 rounded-full bg-muted px-200 py-100 text-100 font-semibold text-muted-foreground">
                      Retired
                    </span>
                  ) : null}
                  {r.derived ? (
                    <span
                      className="ml-200 rounded-full border border-border px-200 py-100 text-100 text-muted-foreground"
                      title="The agent has to calculate this answer rather than look it up"
                    >
                      Derived
                    </span>
                  ) : null}
                </td>
                <td className={cn(td, 'text-right font-numeric')}>
                  {r.ratings}
                </td>
                <td className={td}>
                  <div className="flex flex-col gap-100">
                    <StackedBar
                      total={r.ratings}
                      parts={[
                        {
                          label: 'Yes',
                          count: r.yes,
                          className: 'bg-promoter',
                        },
                        {
                          label: 'Partially',
                          count: r.partially,
                          className: 'bg-passive',
                        },
                        { label: 'No', count: r.no, className: 'bg-detractor' },
                      ]}
                    />
                    <span className="font-numeric text-100 text-muted-foreground">
                      {r.ratings
                        ? `${r.yes} · ${r.partially} · ${r.no}`
                        : 'not rated yet'}
                    </span>
                  </div>
                </td>
                {RESPONSE_DIMENSIONS.map((d) => (
                  <td key={d.key} className={cn(td, 'text-right font-numeric')}>
                    {fmtScore(r.averages[d.key])}
                  </td>
                ))}
                <td className={td}>
                  <div className="flex items-center gap-200">
                    <div className="flex-1">
                      <ScoreBar
                        value={r.score}
                        label={`Question ${r.number}`}
                      />
                    </div>
                    <span className="w-600 text-right font-numeric font-semibold">
                      {fmtScore(r.score)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- granular tables ----------

const CONTINUE_LABEL: Record<string, string> = Object.fromEntries(
  CONTINUE_USING_OPTIONS.map((c) => [c.value, c.label]),
);

const OVERALL_COLUMNS = [
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'userEmail', label: 'User' },
  { key: 'npsScore', label: 'NPS (0–10)' },
  { key: 'overallRating', label: 'Experience (1–5)' },
  { key: 'continueUsing', label: 'Keep using' },
  { key: 'workedWell', label: 'Worked well' },
  { key: 'improvements', label: 'Improve' },
] as const;

const QUESTION_COLUMNS = [
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'userEmail', label: 'User' },
  { key: 'source', label: 'Source' },
  { key: 'guidedQuestionNumber', label: '#' },
  { key: 'question', label: 'Question' },
  { key: 'answered', label: 'Answered' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'usefulness', label: 'Usefulness' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'agentResponse', label: 'Agent response' },
  { key: 'comment', label: 'Comment' },
  { key: 'screenshots', label: 'Screenshots' },
] as const;

function matches(row: object, needle: string): boolean {
  if (!needle) return true;
  return Object.values(row).some(
    (v) => v != null && String(v).toLowerCase().includes(needle),
  );
}

function cellText(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '–';
  if (key === 'submittedAt') return fmtDate(value);
  if (key === 'continueUsing')
    return CONTINUE_LABEL[String(value)] ?? String(value);
  if (key === 'screenshots') {
    const n = String(value).split('\n').filter(Boolean).length;
    return `${n} image${n === 1 ? '' : 's'}`;
  }
  return String(value);
}

const LONG_TEXT = new Set([
  'workedWell',
  'improvements',
  'question',
  'agentResponse',
  'comment',
]);

function ResponseTables({
  overall,
  questions,
}: {
  overall: OverallRow[];
  questions: RatingRow[];
}) {
  const [table, setTable] = useState<'overall' | 'questions'>('overall');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'All' | 'Guided' | 'Freeform'>('All');
  const needle = search.trim().toLowerCase();

  const rows = useMemo(() => {
    if (table === 'overall') return overall.filter((r) => matches(r, needle));
    return questions.filter(
      (r) => (source === 'All' || r.source === source) && matches(r, needle),
    );
  }, [table, overall, questions, needle, source]);

  const columns = table === 'overall' ? OVERALL_COLUMNS : QUESTION_COLUMNS;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-400">
      <div className="flex flex-wrap items-center gap-300">
        <div
          role="tablist"
          aria-label="Table"
          className="flex gap-100 rounded-lg bg-muted p-100"
        >
          {(
            [
              ['overall', `Overall feedback (${overall.length})`],
              ['questions', `Question ratings (${questions.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={table === id}
              onClick={() => setTable(id)}
              className={cn(
                'rounded-md px-300 py-200 text-[length:var(--text-200)] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                table === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {table === 'questions' ? (
          <label className="flex items-center gap-200 text-200 text-muted-foreground">
            Source
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              className="rounded-lg border border-input bg-card px-200 py-200 text-200 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option>All</option>
              <option>Guided</option>
              <option>Freeform</option>
            </select>
          </label>
        ) : null}
        <label className="relative flex min-w-[200px] flex-1 items-center">
          <span className="sr-only">Search responses</span>
          <Search
            className="pointer-events-none absolute left-300 text-muted-foreground icon-size-200"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, question, comments…"
            className="w-full rounded-lg border border-input bg-card py-200 pr-300 pl-800 text-200 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `${table === 'overall' ? 'overall-feedback' : 'question-feedback'}-${stamp}.csv`,
              columns,
              rows as unknown as Record<string, unknown>[],
            )
          }
          disabled={rows.length === 0}
          className={cn(
            smallButton,
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Download className="icon-size-200" aria-hidden="true" />
          Export CSV
        </button>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[960px] border-collapse">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.key} className={th}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-300 py-800 text-center text-300 text-muted-foreground"
                >
                  {needle || source !== 'All'
                    ? 'No rows match your filters.'
                    : 'No responses yet.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-b-0 hover:bg-hover"
                >
                  {columns.map((c) => {
                    const text = cellText(
                      c.key,
                      (r as unknown as Record<string, unknown>)[c.key],
                    );
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          td,
                          LONG_TEXT.has(c.key)
                            ? 'min-w-[220px] max-w-[360px]'
                            : 'whitespace-nowrap',
                        )}
                      >
                        {c.key === 'screenshots' && text !== '–' ? (
                          <span
                            className="underline decoration-dotted"
                            title={String(
                              (r as unknown as Record<string, unknown>)[c.key],
                            )}
                          >
                            {text}
                          </span>
                        ) : LONG_TEXT.has(c.key) ? (
                          <span className="line-clamp-3" title={text}>
                            {text}
                          </span>
                        ) : (
                          text
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-200 text-muted-foreground">
        Screenshots are saved in{' '}
        <a
          href={SCREENSHOT_LAKEHOUSE.portalUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary underline"
        >
          {SCREENSHOT_LAKEHOUSE.name}
        </a>{' '}
        under {SCREENSHOT_LAKEHOUSE.folder}. Hover a Screenshots cell to see
        its file paths, or export to CSV.
      </p>
    </div>
  );
}
