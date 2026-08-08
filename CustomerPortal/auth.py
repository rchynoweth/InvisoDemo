"""Simple username/password auth for the Flask server underneath Dash.

Single shared internal login for now (PORTAL_USERNAME / PORTAL_PASSWORD_HASH
env vars). This is intentionally minimal — Entra ID SSO is the known next
step before this portal is exposed beyond internal use.
"""

import os

from flask import redirect, request
from flask_login import LoginManager, UserMixin, current_user, login_user, logout_user
from werkzeug.security import check_password_hash

login_manager = LoginManager()

_PUBLIC_PATHS = ("/login",)
_PUBLIC_PREFIXES = ("/_dash-", "/assets/")


class User(UserMixin):
    def __init__(self, username: str):
        self.id = username


@login_manager.user_loader
def load_user(user_id: str):
    if user_id == os.environ.get("PORTAL_USERNAME"):
        return User(user_id)
    return None


def _is_public(path: str) -> bool:
    return path in _PUBLIC_PATHS or path.startswith(_PUBLIC_PREFIXES)


_LOGIN_STYLE = """
  body { font-family: -apple-system, "Segoe UI", sans-serif; background: #0a1a33; color: #1a1f2b;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  form { background: #ffffff; padding: 2.5rem; border-radius: 10px; width: 320px;
         box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); }
  h1 { font-size: 1.25rem; margin: 0 0 1.5rem; color: #0a1a33; }
  input { width: 100%; padding: 0.6rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid #cdd5e3;
          box-sizing: border-box; }
  button { width: 100%; padding: 0.6rem; border-radius: 6px; border: none; background: #0066cc;
           color: white; font-weight: 600; cursor: pointer; }
  .error { color: #c62828; margin-bottom: 1rem; font-size: 0.9rem; }
"""


def _login_page(error_html=""):
    return f"""
<!doctype html>
<html>
<head><title>Customer Portal — Log in</title>
<style>{_LOGIN_STYLE}</style>
</head>
<body>
  <form method="post">
    <h1>Customer Portal</h1>
    {error_html}
    <input name="username" placeholder="Username" autofocus>
    <input name="password" type="password" placeholder="Password">
    <button type="submit">Log in</button>
  </form>
</body>
</html>
"""


def init_auth(server):
    server.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
    login_manager.init_app(server)

    @server.before_request
    def _require_login():
        if _is_public(request.path) or current_user.is_authenticated:
            return None
        return redirect(f"/login?next={request.path}")

    @server.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "GET":
            return _login_page()

        username = request.form.get("username", "")
        password = request.form.get("password", "")
        expected_username = os.environ.get("PORTAL_USERNAME", "")
        expected_hash = os.environ.get("PORTAL_PASSWORD_HASH", "")

        if username == expected_username and expected_hash and check_password_hash(expected_hash, password):
            login_user(User(username))
            return redirect(request.args.get("next") or "/")

        return _login_page('<div class="error">Invalid username or password.</div>')

    @server.route("/logout")
    def logout():
        logout_user()
        return redirect("/login")
