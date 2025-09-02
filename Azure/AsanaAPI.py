import requests



# url = "https://app.asana.com/api/1.0/allocations"
url = "https://app.asana.com/api/1.0/teams/<workspace>/users"
token = ""

headers = {"Authorization": "Bearer " + token,    
            # "Content-Type": "application/json",
}


response = requests.get(url, headers=headers)

response.status_code
response.content

# https://developers.asana.com/reference/getallocations
allocation_url = "https://app.asana.com/api/1.0/allocations?assignee=<assignee>&workspace=<workspace>"
response = requests.get(allocation_url, headers=headers)

response.status_code
response.content
