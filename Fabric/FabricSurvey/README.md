# Data agent feedback app

A Fabric App (built on [Rayfin](https://github.com/microsoft/project-rayfin)) that collects feedback on a Fabric data agent and stores it in the app's Fabric SQL database for analytics.

Users sign in with their Microsoft work account and get three tabs:

- **Guided questions**: steps through the question list one at a time. "Did it answer?", four 1–5 scores, the agent's response, feedback and screenshots.
- **Rate an answer**: the same scores for a question the user asked themselves.
- **Overall feedback**: NPS, overall rating, whether they'd keep using it, and two free-text answers.

Admins (listed in `ANALYTICS_ADMINS`) also get **Analytics** and, from the dropdown on their name, **Settings** for managing the guided questions.

## Layout

```text
packages/
  shared/     Record types and app settings (AGENT_NAME, ANALYTICS_ADMINS, scales)
  data/       Tables and their access rules (Rayfin entities)
  functions/  uploadScreenshot: writes images to a Lakehouse in OneLake
  frontend/   React app
    src/lib/data.ts       every read/write the app makes
    src/lib/analytics.ts  summaries and CSV export (pure functions)
    src/components/       forms, analytics, settings
rayfin/rayfin.yml         services and deployment config
```

## Data

| Table | Holds |
|---|---|
| `GuidedQuestions` | The guided question list. `questionNumber` is the stable key; `active = 0` retires a question. Managed in Settings. |
| `QuestionFeedbacks` | One row per answer rating. `source` is `Guided` or `Freeform`; guided rows join on `guidedQuestionNumber = GuidedQuestions.questionNumber`. `screenshots` holds Lakehouse paths, one per line. |
| `OverallFeedbacks` | One row per overall response. |

Users can create rows and read only their own; admins can read everything and edit the questions. Screenshots are stored in the Lakehouse named in `SCREENSHOT_LAKEHOUSE`, under `Files/screenshots/YYYY/MM/DD/`.

The app ships with no questions. Add them in Settings after deploying, so no customer content lives in the code.

## Commands

Run from this folder:

| Command | What it does |
|---|---|
| `npm run dev:frontend` | Local frontend against the deployed backend (signs in with your `npx rayfin login` session). |
| `npm run typecheck`, `npm run lint`, `npm test` | Checks. |
| `npx rayfin up` | Build and deploy to Fabric, applying schema changes. |

Changing a function's signature in `packages/functions` needs `npx rayfin dev functions apply` (and Azure Functions Core Tools) to regenerate `packages/functions/src/types.ts`.

To reuse the app for another agent, change `AGENT_NAME`, `ANALYTICS_ADMINS` and `SCREENSHOT_LAKEHOUSE` in `packages/shared/src/index.ts`, the Lakehouse URL in `packages/functions/src/function_app.ts`, and the page title in `packages/frontend/index.html`.
