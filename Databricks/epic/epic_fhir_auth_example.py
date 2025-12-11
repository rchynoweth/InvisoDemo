## This script demonstrates a simple workflow to authenticate against the FHIR APIs on Epic

import time
import uuid
import requests
import jwt  # pyjwt
import json


EPIC_TOKEN_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_FHIR_BASE_URL = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"

CLIENT_ID = "<client_id>"
PRIVATE_KEY_PATH = "Databricks/epic/epic_private_key.pem"  # path to your private key

# For Bulk Export you need broad scopes like:
# system/*.read or system/Patient.read system/Encounter.read etc.
EPIC_SCOPE = "system/*.read"

# Must match the "kid" in your jwks.json
KID = "epic-backend-key-1"


# ------------------------------------------
# AUTH HELPERS
# ------------------------------------------

def load_private_key() -> str:
    with open(PRIVATE_KEY_PATH, "r") as f:
        return f.read()


def build_client_assertion(client_id: str, token_url: str, private_key: str) -> str:
    now = int(time.time())

    payload = {
        "iss": client_id,
        "sub": client_id,
        "aud": token_url,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + 300,  # JWT is valid for 5 minutes
    }

    headers = {
        "typ": "JWT",
        "kid": KID,  # MUST match jwks.json
    }

    jwt_token = jwt.encode(
        payload,
        private_key,
        algorithm="RS384",  # must match alg in jwks.json
        headers=headers,
    )

    if isinstance(jwt_token, bytes):
        jwt_token = jwt_token.decode("utf-8")

    return jwt_token


def get_epic_access_token() -> str:
    private_key = load_private_key()
    client_assertion = build_client_assertion(CLIENT_ID, EPIC_TOKEN_URL, private_key)

    data = {
        "grant_type": "client_credentials",
        "scope": EPIC_SCOPE,
        "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        "client_assertion": client_assertion,
    }

    resp = requests.post(EPIC_TOKEN_URL, data=data)

    token = json.loads(resp.content.decode("utf-8")).get("access_token")
    if not token:
        print("Error retrieving token:", resp.text)
        resp.raise_for_status()

    return token


if __name__ == "__main__":
    print("Getting Epic token...")
    token = get_epic_access_token()
    print(f"Token: {token}")
