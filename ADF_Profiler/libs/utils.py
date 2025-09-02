import requests
import dotenv
import os
import json
from azure.identity import DefaultAzureCredential, InteractiveBrowserCredential

# Set Variables
dotenv.load_dotenv('./ADF_Profiler/.env')
workspace_name = os.getenv("workspace_name")
tenant_id = os.getenv("tenant_id")
api_version = os.getenv("api_version", "2020-12-01")
output_folder = os.getenv("output_folder", "data")
batch_id = 0

# Get an access token for Synapse
# credential = DefaultAzureCredential()
credential = InteractiveBrowserCredential(tenant_id=tenant_id)
token = credential.get_token("https://dev.azuresynapse.net/.default")

# format headers
headers = {
    "Authorization": f"Bearer {token.token}",
    "Content-Type": "application/json"
}

##### 
## List / Get Synapse Data
##### 
def get_synapse_data(endpoint, next_link=None):
    # assert endpoint in ["pipelines", "linkedservices",  None], "Endpoint must be 'pipelines' or 'linkedservices'"
    assert (endpoint is None) ^ (next_link is None), "Either endpoint or next_link must be provided, not both"

    # set URL
    if endpoint is not None:
        url = f"https://{workspace_name}.dev.azuresynapse.net/{endpoint}?api-version={api_version}"
    else:
        url = next_link
        
    # Call the API and get next page url
    response = requests.get(url, headers=headers)
    return response


##### 
## Function to save JSON data to file
##### 
def save_synapse_data(data, suffix, prefix):
    # Write dict to JSON file
    with open(f"{output_folder}/{prefix}_{suffix}.json", "w") as f:
        json.dump(data, f)
    return


