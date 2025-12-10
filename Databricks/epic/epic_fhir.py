import time
import uuid
import requests
import jwt  # pyjwt


# Configure these for your Epic sandbox backend service
EPIC_TOKEN_URL = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
EPIC_SCOPE = "system/Encounter.read"


def get_epic_access_token():
    # 1. Load client ID and private key from Databricks secrets
    # client_id = dbutils.secrets.get("epic-scope", "epic-client-id")
    # private_key = dbutils.secrets.get("epic-scope", "epic-private-key")  # PEM string

    client_id = '0f7b7896-a85b-470d-991c-62056a788727'
    with open("Databricks/epic/epic_private_key.pem", "r") as f:
        private_key = f.read()


    now = int(time.time())

    # 2. Build JWT payload
    payload = {
        "iss": client_id,
        "sub": client_id,
        "aud": EPIC_TOKEN_URL,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + 300  # 5 minutes
    }

    # 3. JWT header – include kid if you set one in JWKS
    # If you know your key ID, set it here. Otherwise omit 'kid'
    headers = {
        "alg": "RS384",
        "typ": "JWT",
        "kid": "39e2c153-ee49-4cad-8ad3-dfdf60c81f69"  # optional but recommended
    }

    client_assertion = jwt.encode(
        payload,
        private_key,
        algorithm="RS384",
        headers=headers
    )

    # 4. Exchange JWT for access token at Epic
    data = {
        "grant_type": "client_credentials",
        "scope": EPIC_SCOPE,
        "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        "client_assertion": client_assertion
    }

    response = requests.post(EPIC_TOKEN_URL, data=data)
    token_response = response.json()
    token_response

    return token_response["access_token"], token_response.get("expires_in")

# Example usage
access_token, expires_in = get_epic_access_token()
print("Token acquired, expires in", expires_in, "seconds")
