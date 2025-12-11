




## Authentication for Epic on FHIR
1. Run this command locally to generate your files. 
    ```
    # 1) Generate private key (keep this SECRET)
    openssl genrsa -out epic_private_key.pem 2048

    # 2) Generate a self-signed certificate containing the public key
    openssl req -new -x509 -key epic_private_key.pem -out epic_public_cert.cer -days 3650 -subj "/CN=epic-backend-client" -config NUL

    # 3) Generate a public key
    openssl rsa -in epic_private_key.pem -pubout -out epic_public_key.pem

    ```


1. Execute the `create_jwks_key.py` script. I had to install the following libraries. 
    - pip install jwcrypto
    - pip install requests
    - pip install PyJWT


1. Create a `jwks.json` file with the contents from above. This is used to programmatically generate an access token for access to the APIs. 
    - I hosted mine on GitHub and it will return as needed 
    - More secure option would be Azure storage with a firewall 
    - https://raw.githubusercontent.com/rchynoweth/InvisoDemo/45417b1ea7ab6abc266cc79d38a25058e9571442/Databricks/epic/jwks.json

1. Run `epic_fhir_auth_example.py` script to generate an access token. 