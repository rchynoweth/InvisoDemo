"""SQLite-backed data access, standing in for the eventual Fabric backend.

Project/time card master data and forecasts are seeded once (see db.py) and
read from SQLite here; project status is read from the latest row per
project in `status_updates` (see schema.sql for why: it's the shared table a
future automated summary job and manual edits both write to).
"""

from datetime import datetime, timezone

from datasource import db
from datasource.models import Forecast, Project, StatusUpdate, TimeCardEntry

_PROJECT_WITH_STATUS_SQL = """
    SELECT p.id, p.name, p.client, p.pm_name, p.start_date, p.end_date,
           p.budget_hours, p.budget_amount, su.status, su.health, su.next_steps
    FROM projects p
    JOIN status_updates su ON su.id = (
        SELECT id FROM status_updates
        WHERE project_id = p.id
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
    )
"""


def get_active_projects() -> list[Project]:
    conn = db.connect()
    try:
        rows = conn.execute(f"{_PROJECT_WITH_STATUS_SQL} ORDER BY p.id").fetchall()
        return [Project(**dict(row)) for row in rows]
    finally:
        conn.close()


def get_project(project_id: str) -> Project | None:
    conn = db.connect()
    try:
        row = conn.execute(f"{_PROJECT_WITH_STATUS_SQL} WHERE p.id = ?", (project_id,)).fetchone()
        return Project(**dict(row)) if row else None
    finally:
        conn.close()


def get_timecards(project_id: str) -> list[TimeCardEntry]:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT project_id, employee, week_ending, hours, billable FROM timecards "
            "WHERE project_id = ? ORDER BY week_ending",
            (project_id,),
        ).fetchall()
        return [TimeCardEntry(row["project_id"], row["employee"], row["week_ending"],
                               row["hours"], bool(row["billable"])) for row in rows]
    finally:
        conn.close()


def get_forecasts(project_id: str | None = None) -> list[Forecast]:
    conn = db.connect()
    try:
        if project_id:
            rows = conn.execute(
                "SELECT project_id, month, forecasted_revenue, entered_by, entered_at "
                "FROM forecasts WHERE project_id = ? ORDER BY month",
                (project_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT project_id, month, forecasted_revenue, entered_by, entered_at "
                "FROM forecasts ORDER BY project_id, month"
            ).fetchall()
        return [Forecast(**dict(row)) for row in rows]
    finally:
        conn.close()


def save_forecast(project_id: str, month: str, amount: float, entered_by: str) -> None:
    amount = float(amount)
    if amount < 0:
        raise ValueError("Forecasted revenue cannot be negative.")

    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO forecasts (project_id, month, forecasted_revenue, entered_by, entered_at) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(project_id, month) DO UPDATE SET "
            "forecasted_revenue = excluded.forecasted_revenue, "
            "entered_by = excluded.entered_by, "
            "entered_at = excluded.entered_at",
            (project_id, month, amount, entered_by, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def get_status_history(project_id: str) -> list[StatusUpdate]:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT project_id, status, health, next_steps, source, updated_by, updated_at "
            "FROM status_updates WHERE project_id = ? ORDER BY updated_at DESC, id DESC",
            (project_id,),
        ).fetchall()
        return [StatusUpdate(**dict(row)) for row in rows]
    finally:
        conn.close()


def save_status_update(project_id: str, status: str, health: str, next_steps: str,
                        source: str, updated_by: str) -> None:
    if status not in db.ALLOWED_STATUSES:
        raise ValueError(f"Invalid status: {status!r}")
    if health not in db.ALLOWED_HEALTHS:
        raise ValueError(f"Invalid health: {health!r}")
    if source not in ("manual", "auto"):
        raise ValueError(f"Invalid source: {source!r}")

    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO status_updates (project_id, status, health, next_steps, source, updated_by, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (project_id, status, health, next_steps, source, updated_by,
             datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()
