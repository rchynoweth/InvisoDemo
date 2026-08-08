from dataclasses import dataclass


@dataclass
class Project:
    id: str
    name: str
    client: str
    pm_name: str
    start_date: str
    end_date: str
    budget_hours: float
    budget_amount: float
    status: str
    health: str
    next_steps: str


@dataclass
class TimeCardEntry:
    project_id: str
    employee: str
    week_ending: str
    hours: float
    billable: bool


@dataclass
class Forecast:
    project_id: str
    month: str
    forecasted_revenue: float
    entered_by: str
    entered_at: str


@dataclass
class StatusUpdate:
    project_id: str
    status: str
    health: str
    next_steps: str
    source: str
    updated_by: str
    updated_at: str
