import json
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

PUBLIC_KEY_PATH = "Databricks/epic/epic_public_key.pem"  # from your earlier OpenSSL step
KID = "epic-backend-key-1"               # arbitrary label; we'll reuse this in the JWT


def b64url_uint(val: int) -> str:
    """Convert an integer to base64url-encoded string without padding."""
    length = (val.bit_length() + 7) // 8
    b = val.to_bytes(length, "big")
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


with open(PUBLIC_KEY_PATH, "rb") as f:
    pub_key = serialization.load_pem_public_key(f.read(), backend=default_backend())

numbers = pub_key.public_numbers()
n = b64url_uint(numbers.n)
e = b64url_uint(numbers.e)

jwks = {
    "keys": [
        {
            "kty": "RSA",
            "use": "sig",
            "alg": "RS384",        # matches what we'll use in Python
            "kid": KID,
            "n": n,
            "e": e,
        }
    ]
}

with open("Databricks/epic/jwks.json", "w") as f:
    json.dump(jwks, f, indent=2)

print("Wrote jwks.json with kid =", KID)
