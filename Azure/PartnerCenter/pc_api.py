import requests

# 1. Configuration
TENANT_ID = 'your-tenant-id'
CLIENT_ID = 'your-client-id'
CLIENT_SECRET = 'your-client-secret'

# Partner Center API Details
AUTH_URL = f"https://login.microsoftonline.com{TENANT_ID}/oauth2/v2.0/token"
API_BASE_URL = "https://api.partnercenter.microsoft.com"
SCOPE = "https://api.partnercenter.microsoft.com/.default"

# 2. Get Access Token
auth_data = {
    'grant_type': 'client_credentials',
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'scope': SCOPE
}

token_res = requests.post(AUTH_URL, data=auth_data)
token_res.raise_for_status()
access_token = token_res.json().get('access_token')

# 3. Simple GET Request to List Customers
headers = {
    'Authorization': f'Bearer {access_token}',
    'Accept': 'application/json'
}

customer_res = requests.get(f"{API_BASE_URL}/customers", headers=headers)
customer_res.raise_for_status()

# 4. Output Results
customers = customer_res.json().get('items', [])
for customer in customers:
    print(f"Name: {customer.get('companyProfile', {}).get('companyName')} | ID: {customer.get('id')}")
