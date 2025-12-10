


1. Run this command locally. 
```
# 1. Generate a 4096-bit RSA private key
openssl genrsa -out epic_private_key.pem 4096

# 2. Extract the public key
openssl rsa -in epic_private_key.pem -pubout -out epic_public_key.pem
```


1. Create_JWKS_Key.py
    - pip install jwcrypto
    - pip install requests


1. Create a `jwks.json` file with the contents from above. 
    - I hosted mine on GitHub and it will return as needed 
    - More secure option would be Azure storage with a firewall 
    - https://raw.githubusercontent.com/rchynoweth/InvisoDemo/45417b1ea7ab6abc266cc79d38a25058e9571442/Databricks/epic/jwks.json

1. 