import os

import dash
import dash_bootstrap_components as dbc
from dotenv import load_dotenv
from dash import Dash, html

load_dotenv()

app = Dash(
    __name__,
    use_pages=True,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    title="Customer Portal",
    # Each page's components only exist in the layout once that page is
    # routed to, but Dash validates callback IDs against the initial
    # layout (navbar + page-container placeholder) at startup. Without
    # this, every page-specific callback throws a false-positive
    # "no components with that id exist" error.
    suppress_callback_exceptions=True,
)
server = app.server

from auth import init_auth  # noqa: E402  (needs `server` to exist first)

init_auth(server)

navbar = dbc.NavbarSimple(
    children=[
        dbc.NavItem(dbc.NavLink("Overview", href="/")),
        dbc.NavItem(dbc.NavLink("Forecast", href="/forecast")),
        dbc.NavItem(dbc.NavLink("Log out", href="/logout")),
    ],
    brand="Customer Portal",
    brand_href="/",
    color="dark",
    dark=True,
)

app.layout = html.Div([navbar, dbc.Container(dash.page_container, fluid=True, class_name="py-4")])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8050))
    app.run(host="0.0.0.0", port=port, debug=True)
