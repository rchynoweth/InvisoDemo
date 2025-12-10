from jwcrypto import jwk
import json
import uuid

# Load the public key
with open("epic_public_key.pem", "rb") as f:
    pub_pem = f.read()

key = jwk.JWK.from_pem(pub_pem)

# Set a key ID so Epic can identify which key is used
key_id = str(uuid.uuid4())
key["kid"] = key_id  # add kid

jwks = {"keys": [json.loads(key.export(private_key=False))]}

print(json.dumps(jwks, indent=2))
