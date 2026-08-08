import os
import base64
from dotenv import load_dotenv

from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.containerservice import ContainerServiceClient

load_dotenv()

SUBSCRIPTION_ID = os.environ["AZURE_SUBSCRIPTION_ID"]
LOCATION = os.getenv("AZURE_LOCATION", "eastus")
RESOURCE_GROUP = os.getenv("AZURE_RESOURCE_GROUP", "rg-spark-poc")
AKS_NAME = os.getenv("AZURE_AKS_NAME", "aks-spark-poc")
NODE_COUNT = int(os.getenv("AKS_NODE_COUNT", "2"))
NODE_VM_SIZE = os.getenv("AKS_NODE_VM_SIZE", "Standard_D4s_v5")
KUBECONFIG_PATH = os.getenv("KUBECONFIG_PATH", "~/.kube/aks-spark-poc.yaml")


def provision_rg(resource_client: ResourceManagementClient, rg: str, location: str):
    resource_client.resource_groups.create_or_update(rg, {"location": location})


def provision_aks(cs_client: ContainerServiceClient, rg: str, aks: str, location: str,
                  node_count: int, node_vm_size: str):
    poller = cs_client.managed_clusters.begin_create_or_update(
        rg,
        aks,
        {
            "location": location,
            "dns_prefix": aks,
            "identity": {"type": "SystemAssigned"},
            "agent_pool_profiles": [
                {
                    "name": "nodepool1",
                    "mode": "System",
                    "count": node_count,
                    "vm_size": node_vm_size,
                    "os_type": "Linux",
                    "type": "VirtualMachineScaleSets",
                }
            ],
            "oidc_issuer_profile": {"enabled": True},
            "security_profile": {"workload_identity": {"enabled": True}},
            "network_profile": {"network_plugin": "azure"},
        },
    )
    poller.result()



def write_kubeconfig(cs_client, rg: str, aks: str, kubeconfig_path: str):
    creds = cs_client.managed_clusters.list_cluster_admin_credentials(rg, aks)
    raw = creds.kubeconfigs[0].value  # str or bytes

    # Normalize to bytes
    raw_bytes = raw.encode("utf-8") if isinstance(raw, str) else raw

    # If already YAML, use as-is; otherwise base64-decode once
    if b"apiVersion:" in raw_bytes:
        kubeconfig = raw_bytes.decode("utf-8")
    else:
        kubeconfig = base64.b64decode(raw_bytes).decode("utf-8")

    os.makedirs(os.path.dirname(os.path.abspath(kubeconfig_path)), exist_ok=True)
    with open(kubeconfig_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(kubeconfig)



def main():
    credential = DefaultAzureCredential()
    resource_client = ResourceManagementClient(credential, SUBSCRIPTION_ID)
    cs_client = ContainerServiceClient(credential, SUBSCRIPTION_ID)

    print(f"▶ Resource Group: {RESOURCE_GROUP} ({LOCATION})")
    provision_rg(resource_client, RESOURCE_GROUP, LOCATION)

    print(f"▶ AKS: {AKS_NAME} (this can take a while)")
    provision_aks(cs_client, RESOURCE_GROUP, AKS_NAME, LOCATION, NODE_COUNT, NODE_VM_SIZE)

    print("▶ Fetching kubeconfig...")
    write_kubeconfig(cs_client, RESOURCE_GROUP, AKS_NAME, KUBECONFIG_PATH)


if __name__ == "__main__":
    main()
