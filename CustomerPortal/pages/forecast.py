import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, State, callback, dash_table, html, no_update
from dash.dash_table.Format import Format, Group, Scheme, Symbol
from flask_login import current_user

import datasource as data

dash.register_page(__name__, path="/forecast", name="Forecast")

_TABLE_ID = "forecast-table"
_META_COLUMNS = ("project_id", "project_name")
_MONEY_FORMAT = Format(scheme=Scheme.fixed, precision=0, group=Group.yes, symbol=Symbol.yes, symbol_prefix="$")


def _current_username():
    return current_user.id if current_user.is_authenticated else "unknown"


def _format_compact_currency(amount):
    if amount >= 1_000_000:
        return f"${amount / 1_000_000:.1f}M"
    if amount >= 1_000:
        return f"${amount / 1_000:.1f}K"
    return f"${amount:,.0f}"


def _next_month(month):
    year, mon = (int(x) for x in month.split("-"))
    year, mon = (year + 1, 1) if mon == 12 else (year, mon + 1)
    return f"{year:04d}-{mon:02d}"


def _get_months():
    return sorted({f.month for f in data.get_forecasts()})


def _table_data():
    projects = data.get_active_projects()
    by_project = {}
    for f in data.get_forecasts():
        by_project.setdefault(f.project_id, {})[f.month] = f.forecasted_revenue
    months = _get_months()

    rows = [
        {"project_id": p.id, "project_name": p.name,
         **{month: by_project.get(p.id, {}).get(month, 0) for month in months}}
        for p in projects
    ]
    columns = [{"name": "Project", "id": "project_name", "editable": False}] + [
        {"name": month, "id": month, "editable": True, "type": "numeric", "format": _MONEY_FORMAT}
        for month in months
    ]
    return rows, columns, months


def _kpi_tile(label, value, sub=None):
    return dbc.Col(dbc.Card(dbc.CardBody([
        html.Div(label, className="kpi-label"),
        html.Div(value, className="kpi-value"),
        html.Div(sub, className="kpi-sub") if sub else None,
    ]), className="kpi-tile"), md=4)


def _kpi_row(rows, months):
    totals = {month: sum(r.get(month, 0) for r in rows) for month in months}
    tiles = [_kpi_tile("Active projects forecasted", str(len(rows)))]

    for i, month in enumerate(months):
        sub = None
        if i > 0:
            delta = totals[month] - totals[months[i - 1]]
            sub = html.Span(
                f"{'+' if delta >= 0 else '-'}{_format_compact_currency(abs(delta))} vs {months[i - 1]}",
                className="kpi-up" if delta >= 0 else "kpi-down",
            )
        tiles.append(_kpi_tile(f"Total forecast — {month}", _format_compact_currency(totals[month]), sub))

    return dbc.Row(tiles, className="mb-4")


def layout():
    rows, columns, months = _table_data()
    return html.Div([
        html.H3("Revenue Forecast"),
        html.P("Enter a forecasted revenue amount per project, per month. Edits save automatically.",
               className="text-muted mb-4"),
        html.Div(_kpi_row(rows, months), id="forecast-kpi-row"),
        dbc.Card(dbc.CardBody([
            dbc.Row([
                dbc.Col(html.H5("Forecast by project", className="mb-0"), width="auto"),
                dbc.Col(dbc.Button("+ Add next month", id="forecast-add-month-button",
                                    size="sm", color="secondary", outline=True),
                        width="auto", className="ms-auto"),
            ], className="align-items-center mb-3"),
            dash_table.DataTable(
                id=_TABLE_ID,
                data=rows,
                columns=columns,
                editable=True,
                sort_action="native",
                style_header={"fontWeight": "bold"},
                style_cell={"padding": "8px"},
                style_data_conditional=[{"if": {"column_id": "project_name"}, "fontWeight": 600}],
            ),
            html.Div(id="forecast-save-status", className="mt-3"),
        ])),
    ])


@callback(
    Output("forecast-save-status", "children"),
    Output("forecast-kpi-row", "children"),
    Input(_TABLE_ID, "data"),
    State(_TABLE_ID, "data_previous"),
    prevent_initial_call=True,
)
def _save_edited_cells(rows, previous_rows):
    if not previous_rows:
        return "", no_update

    previous_by_project = {row["project_id"]: row for row in previous_rows}
    entered_by = _current_username()
    saved_count = 0
    errors = []

    for row in rows:
        previous_row = previous_by_project.get(row["project_id"], {})
        for key, value in row.items():
            if key in _META_COLUMNS or previous_row.get(key) == value:
                continue
            try:
                data.save_forecast(row["project_id"], key, float(value or 0), entered_by)
                saved_count += 1
            except ValueError as e:
                errors.append(f"{row['project_name']} ({key}): {e}")

    months = sorted(k for k in rows[0] if k not in _META_COLUMNS) if rows else []
    kpi_row = _kpi_row(rows, months)

    if errors:
        return dbc.Alert("; ".join(errors), color="danger", className="mb-0"), kpi_row
    if saved_count:
        return dbc.Alert(f"Saved {saved_count} update(s).", color="success", className="mb-0"), kpi_row
    return "", kpi_row


@callback(
    Output(_TABLE_ID, "data"),
    Output(_TABLE_ID, "columns"),
    Input("forecast-add-month-button", "n_clicks"),
    prevent_initial_call=True,
)
def _add_month(n_clicks):
    months = _get_months()
    if not months:
        return no_update, no_update

    new_month = _next_month(months[-1])
    entered_by = _current_username()
    for project in data.get_active_projects():
        data.save_forecast(project.id, new_month, 0, entered_by)

    rows, columns, _ = _table_data()
    return rows, columns
