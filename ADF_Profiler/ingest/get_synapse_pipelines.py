# base libs
import json
import os

# custom libs
from ADF_Profiler.libs.utils import *


# Set Variables
output_folder = os.getenv("output_folder", "data")
batch_id = 0
api_endpoint = "pipelines"


##### 
## List / Get All Synapse Pipelines
##### 


# Call the API and get next page url
response = get_synapse_data(endpoint=api_endpoint)
pipeline_data = json.loads(response.content)
next_link = pipeline_data.get('nextLink') # next page of data 

# Write dict to JSON file
save_synapse_data(data=pipeline_data, suffix=batch_id, prefix="synapse_pipelines")


while next_link is not None: 
    batch_id += 1
    # Call the API
    response = get_synapse_data(endpoint=None, next_link=next_link)
    pipeline_data = json.loads(response.content)

    # Write dict to JSON file
    save_synapse_data(data=pipeline_data, suffix=batch_id, prefix="synapse_pipelines")

    next_link = pipeline_data.get('nextLink')

