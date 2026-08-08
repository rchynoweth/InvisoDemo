import dash
import dash_bootstrap_components as dbc
from dash import MATCH, Input, Output, callback, dcc, html

import datasource as data

dash.register_page(__name__, path="/", name="Overview")

_HEALTH_COLOR = {"Green": "success", "Yellow": "warning", "Red": "danger"}
_NEXT_STEPS_PREVIEW_THRESHOLD = 100


def _health_badge(health: str):
    return dbc.Badge(health, color=_HEALTH_COLOR.get(health, "secondary"), className="health-badge")


def _next_steps_section(project):
    is_long = len(project.next_steps) > _NEXT_STEPS_PREVIEW_THRESHOLD
    return html.Div([
        html.Div(
            project.next_steps,
            id={"type": "next-steps-text", "index": project.id},
            className="next-steps-preview" if is_long else "",
        ),
        dbc.Button(
            "Show more", id={"type": "next-steps-toggle", "index": project.id},
            size="sm", color="link", className="p-0",
        ) if is_long else None,
    ])


def _project_card(project):
    return dbc.Card(
        dbc.CardBody([
            dbc.Row([
                dbc.Col(html.H5(dbc.NavLink(project.name, href=f"/project/{project.id}", className="p-0")), width=8),
                dbc.Col(_health_badge(project.health), width=4, className="text-end"),
            ], className="align-items-center"),
            html.P(f"{project.client} · PM: {project.pm_name}", className="text-muted mb-2"),
            dbc.Badge(project.status, color="info", className="status-badge mb-3"),
            html.H6("Next steps", className="text-muted mb-1"),
            _next_steps_section(project),
        ]),
        className=f"project-card health-{project.health.lower()}",
    )


def _matching_projects(search, statuses, pms):
    projects = data.get_active_projects()
    search = (search or "").strip().lower()
    statuses = statuses or []
    pms = pms or []
    return [
        p for p in projects
        if (not statuses or p.status in statuses)
        and (not pms or p.pm_name in pms)
        and (not search or search in p.id.lower() or search in p.name.lower())
    ]


def layout():
    projects = data.get_active_projects()
    pm_options = sorted({p.pm_name for p in projects})
    return html.Div([
        html.H3("Active Projects"),
        html.P(f"{len(projects)} active projects across all clients.", className="text-muted mb-3"),
        dbc.Row([
            dbc.Col(dbc.Input(id="overview-search", placeholder="Search by project code or name...",
                               type="text", debounce=True), md=4),
            dbc.Col(dcc.Dropdown(id="overview-status-filter",
                                  options=[{"label": s, "value": s} for s in data.ALLOWED_STATUSES],
                                  multi=True, placeholder="Filter by status"), md=4),
            dbc.Col(dcc.Dropdown(id="overview-pm-filter",
                                  options=[{"label": pm, "value": pm} for pm in pm_options],
                                  multi=True, placeholder="Filter by PM"), md=4),
        ], className="mb-4"),
        html.Div(id="project-cards-container"),
    ])


@callback(
    Output("project-cards-container", "children"),
    Input("overview-search", "value"),
    Input("overview-status-filter", "value"),
    Input("overview-pm-filter", "value"),
)
def _filter_projects(search, statuses, pms):
    matches = _matching_projects(search, statuses, pms)
    if not matches:
        return dbc.Alert("No projects match your search/filter.", color="light", className="text-muted")
    return dbc.Row([dbc.Col(_project_card(p), md=6, lg=4) for p in matches])


@callback(
    Output({"type": "next-steps-text", "index": MATCH}, "className"),
    Output({"type": "next-steps-toggle", "index": MATCH}, "children"),
    Input({"type": "next-steps-toggle", "index": MATCH}, "n_clicks"),
    prevent_initial_call=True,
)
def _toggle_next_steps(n_clicks):
    expanded = (n_clicks or 0) % 2 == 1
    return ("" if expanded else "next-steps-preview"), ("Show less" if expanded else "Show more")
