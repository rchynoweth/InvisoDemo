# Customer Portal

Internal portal for tracking active client project delivery status, health,
and next steps, plus monthly revenue forecast entry. Built with
[Dash](https://dash.plotly.com/), containerized for local use now with a
straightforward path to Azure later.

Data currently comes from a mock backend (`datasource/mock_backend.py`) seeded
with sample projects/time cards, with forecast edits persisted to a local
SQLite file. The data-access interface in `datasource/__init__.py` is designed
to be swapped to a real Microsoft Fabric backend (`datasource/fabric_backend.py`,
not yet implemented) by setting `PORTAL_DATA_BACKEND=fabric` once Fabric
connection details and table schema are available — no page code needs to change.

## Run locally with Docker

1. Copy `.env.example` to `.env` and fill in `PORTAL_USERNAME` and a generated
   `PORTAL_PASSWORD_HASH`:

   ```
   python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
   ```

2. Build and run:

   ```
   docker compose build
   docker compose up
   ```

3. Open http://localhost:8050, log in, and you should see the mock project
   list. Forecast edits on `/forecast` are saved to a Docker volume
   (`forecast-data`) so they survive `docker compose down && docker compose up`.

## Run locally without Docker

```
pip install -r requirements.txt
python app.py
```

## Folder structure

- `app.py` — Dash app setup, navbar, login gate wiring.
- `auth.py` — Flask-Login setup and the `/login`/`/logout` routes.
- `datasource/` — data-access facade (`__init__.py`), the mock backend, the
  not-yet-implemented Fabric backend stub, and shared dataclasses (`models.py`).
- `pages/` — one file per Dash page (`overview.py`, `project_detail.py`,
  `forecast.py`), auto-registered via Dash Pages.
