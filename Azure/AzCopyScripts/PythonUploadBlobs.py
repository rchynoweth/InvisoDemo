import os
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient

# Azure Storage connection string and container name
connect_str = "YOUR_AZURE_STORAGE_CONNECTION_STRING"
container_name = "your-container-name"
local_file_path = "path/to/your/file.csv"
blob_name = os.path.basename(local_file_path)

# Create the BlobServiceClient object
blob_service_client = BlobServiceClient.from_connection_string(connect_str)

# Create the container if it doesn't exist
container_client = blob_service_client.get_container_client(container_name)
try:
    container_client.create_container()
except Exception:
    pass  # Container already exists

# Upload the CSV file
with open(local_file_path, "rb") as data:
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    blob_client.upload_blob(data, overwrite=True)

print(f"Uploaded {local_file_path} to Azure Blob Storage as {blob_name}")