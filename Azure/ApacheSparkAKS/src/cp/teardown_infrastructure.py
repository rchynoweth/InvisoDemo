import os
from dotenv import load_dotenv

from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.containerservice import ContainerServiceClient

load_dotenv()

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]
RESOURCE_GROUP = os.getenv("AZURE_RESOURCE_GROUP", "rg-spark-poc")
AKS_NAME = os.getenv("AZURE_AKS_NAME", "aks-spark-poc")

# Set to "rg" (recommended) or "aks"
TEARDOWN_SCOPE = os.getenv("TEARDOWN_SCOPE", "rg").lower()


def delete_aks(cs_client: ContainerServiceClient, rg: str, aks: str):
    print(f"▶ Deleting AKS cluster: {aks} (rg={rg})")
    poller = cs_client.managed_clusters.begin_delete(rg, aks)
    poller.result()
    print("✅ AKS deleted")


def delete_rg(resource_client: ResourceManagementClient, rg: str):
    print(f"▶ Deleting Resource Group (deletes everything): {rg}")
    poller = resource_client.resource_groups.begin_delete(rg)
    poller.result()
    print("✅ Resource Group deleted")


def main():
    cred = DefaultAzureCredential()
    resource_client = ResourceManagementClient(cred, SUBSCRIPTION_ID)
    cs_client = ContainerServiceClient(cred, SUBSCRIPTION_ID)

    if TEARDOWN_SCOPE == "aks":
        delete_aks(cs_client, RESOURCE_GROUP, AKS_NAME)
    elif TEARDOWN_SCOPE == "rg":
        delete_rg(resource_client, RESOURCE_GROUP)
    else:
        raise ValueError('TEARDOWN_SCOPE must be "aks" or "rg"')

    print("Done.")


if __name__ == "__main__":
    main()
