//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState, type ComponentType } from 'react';
import { BarChart3, ListChecks, MessageSquareText, Moon, PenLine, Sparkles, Sun } from 'lucide-react';
import { AGENT_NAME } from '@rayfin-app/shared';

import { AnalyticsView } from '@/components/analytics-view';
import { GuidedForm } from '@/components/guided-form';
import { OverallForm } from '@/components/overall-form';
import { QuestionForm } from '@/components/question-form';
import { QuestionSettings } from '@/components/question-settings';
import { UserMenu } from '@/components/user-menu';
import { useAuth } from '@/hooks/auth.context';
import { useTheme } from '@/hooks/theme.context';
import { isAdmin as isAdminEmail } from '@/lib/admins';
import { cn } from '@/lib/utils';

/** The three feedback tabs everyone sees. */
const TABS = [
  {
    id: 'guided',
    label: 'Guided questions',
    blurb: `Ask ${AGENT_NAME} each question, then tell us how it did.`,
    Icon: ListChecks,
    Form: GuidedForm,
  },
  {
    id: 'question',
    label: 'Rate an answer',
    blurb: `About 30 seconds. Score one answer ${AGENT_NAME} gave you.`,
    Icon: MessageSquareText,
    Form: QuestionForm,
  },
  {
    id: 'overall',
    label: 'Overall feedback',
    blurb: `About 1 minute. How ${AGENT_NAME} is working for you overall.`,
    Icon: Sparkles,
    Form: OverallForm,
  },
] as const;

type Page = 'feedback' | 'analytics' | 'settings';

/** Hero text and body per page; analytics and settings are admin only. */
const PAGES: Record<Page, { title: string; subtitle?: string; Body?: ComponentType }> = {
  feedback: { title: 'How are we doing?' },
  analytics: {
    title: 'Feedback analytics',
    subtitle: "Everyone's responses, live from the Fabric SQL database",
    Body: AnalyticsView,
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage the questions on the Guided questions tab',
    Body: QuestionSettings,
  },
};

const width = 'mx-auto w-full px-400 sm:px-600 md:w-4/5';
const navButton =
  'flex items-center gap-200 rounded-lg px-300 py-200 text-[length:var(--text-200)] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inviso-bright';

function App() {
  const { session } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const email = session?.user?.email;
  // The server enforces who can read everyone's rows; this only decides what to offer.
  const isAdmin = isAdminEmail(email);
  const [requested, setPage] = useState<Page>('feedback');
  const page = isAdmin ? requested : 'feedback';
  const [tabId, setTabId] = useState<(typeof TABS)[number]['id']>('guided');
  const tab = TABS.find((t) => t.id === tabId)!;
  const { title, subtitle, Body } = PAGES[page];

  return (
    <div className="min-h-full bg-background">
      <nav className="border-b border-inviso-tint-100 bg-nav text-nav-foreground shadow-sm">
        <div className={cn(width, 'flex items-center justify-between gap-400 py-300')}>
          <span className="truncate text-300 font-semibold">{AGENT_NAME} Feedback</span>
          <div className="flex shrink-0 items-center gap-300">
            {isAdmin
              ? (
                  [
                    ['feedback', 'Give feedback', PenLine],
                    ['analytics', 'Analytics', BarChart3],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={page === id}
                    onClick={() => setPage(id)}
                    className={cn(
                      navButton,
                      page === id
                        ? 'bg-inviso-tint-50 text-inviso-blue'
                        : 'text-inviso-navy hover:bg-inviso-tint-50 hover:text-inviso-blue'
                    )}
                  >
                    <Icon className="icon-size-200" aria-hidden="true" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))
              : null}
            {email ? (
              <UserMenu
                email={email}
                isAdmin={isAdmin}
                settingsActive={page === 'settings'}
                onOpenSettings={() => setPage('settings')}
              />
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-lg p-200 text-inviso-navy transition hover:bg-inviso-tint-50 hover:text-inviso-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inviso-bright"
            >
              {isDark ? <Sun className="icon-size-300" aria-hidden="true" /> : <Moon className="icon-size-300" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      <header className="bg-inviso-navy-gradient text-white">
        <div className={cn(width, 'flex flex-col gap-100 pt-700 pb-hero')}>
          <p className="text-200 font-semibold uppercase tracking-wider text-inviso-teal-200">{AGENT_NAME}</p>
          <h1 className="font-heading text-hero-800 leading-hero-800 font-bold">{title}</h1>
          <p className="text-200 text-inviso-tint-200">{subtitle ?? (email ? `Responding as ${email}` : null)}</p>
        </div>
      </header>

      <main className={cn(width, '-mt-overlap flex flex-col gap-600 pb-800')}>
        {Body ? (
          <Body />
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Feedback type"
              className="grid grid-cols-3 gap-100 rounded-xl border border-border bg-muted p-100 lg:w-2/3"
            >
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tabId === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTabId(id)}
                  className={cn(
                    'flex items-center justify-center gap-200 rounded-lg px-200 py-300 text-[length:var(--text-200)] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-300 sm:text-[length:var(--text-300)]',
                    tabId === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="hidden shrink-0 icon-size-200 sm:block" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <section
              id={`panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              className="flex flex-col gap-600 rounded-2xl border border-border bg-card p-500 shadow-sm sm:p-700"
            >
              <p className="text-300 text-muted-foreground">{tab.blurb}</p>
              <tab.Form />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
