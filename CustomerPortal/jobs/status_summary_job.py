"""Entry point for a future automated status-summary job — not yet implemented.

Intended shape: on a schedule, gather each project's status source (e.g.
weekly status slides), summarize it, and write the result into the same
`status_updates` table manual edits use, distinguished by source:

    from datasource import save_status_update
    save_status_update(project_id, status, health, next_steps,
                        source="auto", updated_by="status-summary-job")

Nothing currently calls `run()` on a schedule — wiring up a scheduler
(e.g. APScheduler, a cron entry, or an Azure Function) is a follow-up once
the summarization logic itself is decided.
"""


def run() -> None:
    raise NotImplementedError(
        "Status summary job is not implemented yet. See module docstring "
        "for the intended shape once a status source and summarizer exist."
    )
