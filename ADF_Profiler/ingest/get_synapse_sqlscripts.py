# base libs
import json
import os

# custom libs
from ADF_Profiler.libs.utils import *


# Set Variables
output_folder = os.getenv("output_folder", "data")
batch_id = 0
api_endpoint = "sqlScripts"
file_prefix = "synapse_sqlscripts"



# Call the API and get next page url
response = get_synapse_data(endpoint=api_endpoint)
data = json.loads(response.content)
next_link = data.get('nextLink') # next page of data 

# Write dict to JSON file
save_synapse_data(data=data, suffix=batch_id, prefix=file_prefix)


while next_link is not None: 
    batch_id += 1
    # Call the API
    response = get_synapse_data(endpoint=None, next_link=next_link)
    pipeline_data = json.loads(response.content)

    # Write dict to JSON file
    save_synapse_data(data=pipeline_data, suffix=batch_id, prefix=file_prefix)

    next_link = pipeline_data.get('nextLink')

