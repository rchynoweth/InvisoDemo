# base libs
import json
import os

# custom libs
from ADF_Profiler.libs.utils import *


# Set Variables
output_folder = os.getenv("output_folder", "data")
batch_id = 0
api_endpoint = "linkedservices"



# Call the API and get next page url
response = get_synapse_data(endpoint=api_endpoint)
data = json.loads(response.content)
next_link = data.get('nextLink') # next page of data 

# Write dict to JSON file
save_synapse_data(data=data, suffix=batch_id, prefix="synapse_linked_services")


while next_link is not None: 
    batch_id += 1
    # Call the API
    response = get_synapse_data(endpoint=None, next_link=next_link)
    data = json.loads(response.content)

    # Write dict to JSON file
    save_synapse_data(data=data, suffix=batch_id, prefix="synapse_linkedservices")

    next_link = data.get('nextLink')


