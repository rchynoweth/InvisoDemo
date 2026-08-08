"""SQLite connection + one-time schema/seed setup, shared by mock_backend.py.

Centralizing this here means schema creation and seeding happen exactly once
at import time, rather than being re-checked on every query as before.
"""

import os
import sqlite3

ALLOWED_STATUSES = ("On Track", "At Risk", "Delayed", "Completed")
ALLOWED_HEALTHS = ("Green", "Yellow", "Red")

# Kept outside the `datasource/` package directory (which is baked into the
# Docker image) so a volume mounted here for persistence doesn't shadow the
# source files that live alongside it in `datasource/`.
_INSTANCE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "instance")
os.makedirs(_INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(_INSTANCE_DIR, "portal.sqlite")

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

_SEED_PROJECTS = [
    ("P001", "ERP Modernization", "Acme Manufacturing", "J. Ortiz", "2026-02-01", "2026-10-31", 4200, 620000),
    ("P002", "Data Platform Migration", "Northwind Traders", "S. Blake", "2026-01-15", "2026-09-15", 3600, 540000),
    ("P003", "Fabric Analytics Rollout", "Contoso Health", "M. Chen", "2026-03-01", "2027-01-31", 5000, 780000),
    ("P004", "Legacy App Decommission", "Fabrikam Retail", "J. Ortiz", "2025-11-01", "2026-08-31", 2800, 410000),
    ("P005", "Customer Data Platform", "Globex Financial", "A. Novak", "2026-04-01", "2026-12-15", 3900, 590000),
    ("P006", "Cloud Cost Optimization", "Initech Logistics", "S. Blake", "2026-05-01", "2026-11-30", 1800, 260000),
    ("P007", "AI Proposal Assistant", "Umbrella Insurance", "M. Chen", "2026-06-01", "2027-02-28", 3100, 470000),
]

_SEEDED_AT = "2026-08-01T00:00:00+00:00"

_SEED_STATUS_UPDATES = [
    ("P001", "On Track", "Green", "Finalize UAT sign-off with client stakeholders."),
    ("P002", "At Risk", "Yellow", "Escalate delayed source-system access approvals."),
    ("P003", "On Track", "Green", "Kick off phase 2 workshops with regional leads."),
    ("P004", "Delayed", "Red", "Get executive sign-off on revised cutover date."),
    ("P005", "On Track", "Green", "Begin integration testing with marketing team."),
    ("P006", "At Risk", "Yellow", "Review revised Azure reservation proposal with finance."),
    ("P007", "On Track", "Green", "Demo v2 workflow to underwriting stakeholders."),
]

_SEED_TIMECARDS = [
    ("P001", "J. Ortiz", "2026-07-18", 38, 1), ("P001", "R. Diaz", "2026-07-18", 40, 1),
    ("P001", "J. Ortiz", "2026-07-25", 36, 1), ("P001", "R. Diaz", "2026-07-25", 40, 1),
    ("P002", "S. Blake", "2026-07-18", 42, 1), ("P002", "K. Patel", "2026-07-18", 35, 1),
    ("P002", "S. Blake", "2026-07-25", 44, 1), ("P002", "K. Patel", "2026-07-25", 30, 0),
    ("P003", "M. Chen", "2026-07-18", 40, 1), ("P003", "L. Fischer", "2026-07-25", 38, 1),
    ("P004", "J. Ortiz", "2026-07-18", 20, 1), ("P004", "T. Nguyen", "2026-07-25", 15, 1),
    ("P005", "A. Novak", "2026-07-18", 39, 1), ("P005", "A. Novak", "2026-07-25", 41, 1),
    ("P006", "S. Blake", "2026-07-18", 18, 1),
    ("P007", "M. Chen", "2026-07-18", 33, 1), ("P007", "L. Fischer", "2026-07-25", 30, 1),
]

_SEED_FORECASTS = [
    ("P001", "2026-08", 78000), ("P001", "2026-09", 82000),
    ("P002", "2026-08", 61000), ("P002", "2026-09", 58000),
    ("P003", "2026-08", 95000), ("P003", "2026-09", 98000),
    ("P004", "2026-08", 42000), ("P004", "2026-09", 40000),
    ("P005", "2026-08", 71000), ("P005", "2026-09", 74000),
    ("P006", "2026-08", 29000), ("P006", "2026-09", 27000),
    ("P007", "2026-08", 58000), ("P007", "2026-09", 60000),
]


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _seed(conn):
    conn.executemany(
        "INSERT INTO projects (id, name, client, pm_name, start_date, end_date, budget_hours, budget_amount) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        _SEED_PROJECTS,
    )
    conn.executemany(
        "INSERT INTO status_updates (project_id, status, health, next_steps, source, updated_by, updated_at) "
        "VALUES (?, ?, ?, ?, 'manual', 'seed', ?)",
        [(*row, _SEEDED_AT) for row in _SEED_STATUS_UPDATES],
    )
    conn.executemany(
        "INSERT INTO timecards (project_id, employee, week_ending, hours, billable) VALUES (?, ?, ?, ?, ?)",
        _SEED_TIMECARDS,
    )
    conn.executemany(
        "INSERT INTO forecasts (project_id, month, forecasted_revenue, entered_by, entered_at) "
        "VALUES (?, ?, ?, 'seed', ?)",
        [(pid, month, amount, _SEEDED_AT) for pid, month, amount in _SEED_FORECASTS],
    )


def _init_db():
    conn = connect()
    try:
        with open(_SCHEMA_PATH) as f:
            conn.executescript(f.read())
        if conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0] == 0:
            _seed(conn)
        conn.commit()
    finally:
        conn.close()


_init_db()
