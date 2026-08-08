"""Microsoft Fabric-backed data access — not yet implemented.

Intended shape once wired up: read `get_active_projects`/`get_timecards`
from a Fabric Lakehouse or Warehouse SQL analytics endpoint (pyodbc +
azure-identity for AAD token auth), and read/write `get_forecasts`/
`save_forecast` against a Fabric Warehouse table (Warehouses support full
T-SQL DML, unlike read-only Lakehouse SQL endpoints).

Each function is stubbed until real connection details and table schema
are available; see .env.example for the FABRIC_* variables to configure
once this is implemented.
"""

from datasource.models import Forecast, Project, StatusUpdate, TimeCardEntry


def _not_implemented():
    raise NotImplementedError(
        "Fabric backend is not implemented yet. Set PORTAL_DATA_BACKEND=mock "
        "in your .env, or implement this module once Fabric connection "
        "details and table schema are available."
    )


def get_active_projects() -> list[Project]:
    _not_implemented()


def get_project(project_id: str) -> Project | None:
    _not_implemented()


def get_timecards(project_id: str) -> list[TimeCardEntry]:
    _not_implemented()


def get_forecasts(project_id: str | None = None) -> list[Forecast]:
    _not_implemented()


def save_forecast(project_id: str, month: str, amount: float, entered_by: str) -> None:
    _not_implemented()


def save_status_update(project_id: str, status: str, health: str, next_steps: str,
                        source: str, updated_by: str) -> None:
    _not_implemented()


def get_status_history(project_id: str) -> list[StatusUpdate]:
    _not_implemented()
