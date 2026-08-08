import dash
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from dash import Input, Output, State, callback, dcc, html, no_update
from flask_login import current_user

import datasource as data

dash.register_page(__name__, path_template="/project/<project_id>", name="Project Detail")

_HEALTH_COLOR = {"Green": "success", "Yellow": "warning", "Red": "danger"}


def _health_badge(health: str):
    return dbc.Badge(health, color=_HEALTH_COLOR.get(health, "secondary"), className="health-badge")


def _status_badge(status: str):
    return dbc.Badge(status, color="info", className="status-badge")


def _history_table(project_id):
    history = data.get_status_history(project_id)
    rows = [
        html.Tr([
            html.Td(h.updated_at.split("T")[0]),
            html.Td(h.status),
            html.Td(h.health),
            html.Td(h.source),
            html.Td(h.updated_by),
            html.Td(h.next_steps),
        ])
        for h in history
    ]
    return dbc.Table(
        [
            html.Thead(html.Tr([html.Th("Date"), html.Th("Status"), html.Th("Health"),
                                 html.Th("Source"), html.Th("Updated by"), html.Th("Next steps")])),
            html.Tbody(rows),
        ],
        bordered=False, hover=True, responsive=True, striped=True, size="sm",
    )


def _burn_chart(project):
    timecards = sorted(data.get_timecards(project.id), key=lambda t: t.week_ending)
    weeks, cumulative_hours, running = [], [], 0.0
    for entry in timecards:
        running += entry.hours
        weeks.append(entry.week_ending)
        cumulative_hours.append(running)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=weeks, y=cumulative_hours, mode="lines+markers", name="Hours logged"))
    fig.add_hline(y=project.budget_hours, line_dash="dash", line_color="red",
                   annotation_text="Budget hours")
    fig.update_layout(
        margin=dict(l=40, r=20, t=30, b=40),
        yaxis_title="Cumulative hours",
        xaxis_title="Week ending",
        height=350,
    )
    return fig


def layout(project_id=None):
    project = data.get_project(project_id) if project_id else None
    if project is None:
        return html.Div([
            html.H3("Project not found"),
            dbc.NavLink("Back to overview", href="/"),
        ])

    timecards = sorted(data.get_timecards(project.id), key=lambda t: t.week_ending)
    rows = [
        html.Tr([html.Td(t.week_ending), html.Td(t.employee), html.Td(t.hours),
                 html.Td("Yes" if t.billable else "No")])
        for t in timecards
    ]

    return html.Div([
        dcc.Store(id="detail-project-id", data=project.id),
        dbc.NavLink("< Back to overview", href="/", className="mb-3 d-inline-block"),
        html.H3(project.name),
        html.P(f"{project.client} — PM: {project.pm_name}", className="text-muted"),
        dbc.Row([
            dbc.Col(html.Div(_status_badge(project.status), id="detail-status-badge"), width="auto"),
            dbc.Col(html.Div(_health_badge(project.health), id="detail-health-badge"), width="auto"),
        ], className="mb-3"),

        dbc.Card(dbc.CardBody([
            html.H6("Next steps"),
            html.P(project.next_steps, id="detail-next-steps-display"),
            html.Hr(),
            html.H6("Update status", className="text-muted"),
            dbc.Row([
                dbc.Col([
                    dbc.Label("Status"),
                    dcc.Dropdown(
                        id="detail-status-dropdown",
                        options=[{"label": s, "value": s} for s in data.ALLOWED_STATUSES],
                        value=project.status, clearable=False,
                    ),
                ], md=4),
                dbc.Col([
                    dbc.Label("Health"),
                    dcc.Dropdown(
                        id="detail-health-dropdown",
                        options=[{"label": h, "value": h} for h in data.ALLOWED_HEALTHS],
                        value=project.health, clearable=False,
                    ),
                ], md=4),
            ], className="mb-2"),
            dbc.Label("Next steps"),
            dbc.Textarea(id="detail-next-steps-textarea", value=project.next_steps, className="mb-2"),
            dbc.Button("Save", id="detail-save-button", color="primary", size="sm"),
            html.Div(id="detail-save-status", className="text-muted mt-2"),
        ]), className="mb-4"),

        html.H5("Status history"),
        html.Div(_history_table(project.id), id="detail-history-container"),

        html.H5("Hours burned vs. budget", className="mt-4"),
        dcc.Graph(figure=_burn_chart(project)),
        html.H5("Recent time card entries", className="mt-4"),
        dbc.Table(
            [
                html.Thead(html.Tr([html.Th("Week ending"), html.Th("Employee"),
                                     html.Th("Hours"), html.Th("Billable")])),
                html.Tbody(rows),
            ],
            bordered=False, hover=True, responsive=True, striped=True,
        ),
    ])


@callback(
    Output("detail-save-status", "children"),
    Output("detail-status-badge", "children"),
    Output("detail-health-badge", "children"),
    Output("detail-next-steps-display", "children"),
    Output("detail-history-container", "children"),
    Input("detail-save-button", "n_clicks"),
    State("detail-project-id", "data"),
    State("detail-status-dropdown", "value"),
    State("detail-health-dropdown", "value"),
    State("detail-next-steps-textarea", "value"),
    prevent_initial_call=True,
)
def _save_status(n_clicks, project_id, status, health, next_steps):
    updated_by = current_user.id if current_user.is_authenticated else "unknown"
    try:
        data.save_status_update(project_id, status, health, next_steps, source="manual", updated_by=updated_by)
    except ValueError as e:
        return str(e), no_update, no_update, no_update, no_update
    return ("Saved.", _status_badge(status), _health_badge(health), next_steps,
            _history_table(project_id))
