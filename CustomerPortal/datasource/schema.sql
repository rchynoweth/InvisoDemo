CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    pm_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    budget_hours REAL NOT NULL CHECK (budget_hours >= 0),
    budget_amount REAL NOT NULL CHECK (budget_amount >= 0)
);

-- "Current" status/health/next_steps for a project is the latest row here by
-- updated_at. A future automated job inserts rows with source='auto'; the
-- manual edit form on the project detail page inserts source='manual'. Full
-- history is kept for free.
CREATE TABLE IF NOT EXISTS status_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id),
    status TEXT NOT NULL CHECK (status IN ('On Track', 'At Risk', 'Delayed', 'Completed')),
    health TEXT NOT NULL CHECK (health IN ('Green', 'Yellow', 'Red')),
    next_steps TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('manual', 'auto')),
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timecards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL REFERENCES projects(id),
    employee TEXT NOT NULL,
    week_ending TEXT NOT NULL,
    hours REAL NOT NULL CHECK (hours >= 0),
    billable INTEGER NOT NULL CHECK (billable IN (0, 1))
);

CREATE TABLE IF NOT EXISTS forecasts (
    project_id TEXT NOT NULL REFERENCES projects(id),
    month TEXT NOT NULL,
    forecasted_revenue REAL NOT NULL CHECK (forecasted_revenue >= 0),
    entered_by TEXT NOT NULL,
    entered_at TEXT NOT NULL,
    PRIMARY KEY (project_id, month)
);
