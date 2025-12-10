


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