"""Data-access facade: pages import only from `data`, never from a specific
backend module. The active backend is chosen once, at import time, via the
PORTAL_DATA_BACKEND env var (`mock` or `fabric`). Swapping backends later is
just flipping that variable — no page code changes.
"""

import os

from datasource import db, fabric_backend, mock_backend

_BACKEND = mock_backend if os.environ.get("PORTAL_DATA_BACKEND", "mock") == "mock" else fabric_backend

get_active_projects = _BACKEND.get_active_projects
get_project = _BACKEND.get_project
get_timecards = _BACKEND.get_timecards
get_forecasts = _BACKEND.get_forecasts
save_forecast = _BACKEND.save_forecast
save_status_update = _BACKEND.save_status_update
get_status_history = _BACKEND.get_status_history

# Allowed values, shared by the DB layer's CHECK constraints and any UI
# (e.g. dropdown options) that needs to offer/validate the same choices.
ALLOWED_STATUSES = db.ALLOWED_STATUSES
ALLOWED_HEALTHS = db.ALLOWED_HEALTHS
