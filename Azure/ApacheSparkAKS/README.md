# Apache Spark on AKS 

This code base is intended to be a proof of concept for running Apache Spark workloads on AKS. 



## Getting Started Locally

1. Conda environment creation. 

    ```
    conda create -n spark-lite python=3.12 -y
    conda activate spark-lite

    pip install azure-identity 
    pip install azure-mgmt-resource 
    pip install azure-mgmt-containerservice 
    pip install kubernetes 
    pip install azure-cli 
    pip install dotenv
    pip install pyyaml 
    pip install kubernetes 
    pip install requests
    ```

1. Set up Azure CLI authentication
    ```
    az login
    az account set --subscription "Visual Studio Enterprise Subscription – MPN"

    az aks install-cli
    ```

1. Local install of helm:
    ```
    winget install -e --id Helm.Helm
    ```

1. Spark UI while job is running:
```
$env:KUBECONFIG="C:/gitmine/InvisoDemo/Azure/ApacheSparkAKS/aks-spark-poc.yaml"
kubectl get nodes
kubectl get pods -n spark-operator -l spark-role=driver
kubectl port-forward -n spark pod/hello-spark-driver-7c9x2 4040:4040
http://localhost:4040
```



Resources: 
- [What is AKS?](https://learn.microsoft.com/en-us/azure/aks/what-is-aks)
- [Pricing](https://azure.microsoft.com/en-us/pricing/details/kubernetes-service/#pricing)
- [Spark AKS Example](https://docs.azure.cn/en-us/aks/spark-job#create-an-aks-cluster)
- [Spark K8](https://github.com/apache/spark-kubernetes-operator)



## Apache Spark on Kubernetes — Architecture & Networking Overview

This document describes the runtime architecture and networking model for deploying Apache Spark on Kubernetes (AKS), optimized for ephemeral, job-scoped execution using one container per pod.

---

### Architectural Model

Apache Spark on Kubernetes executes each Spark job as a temporary, isolated micro-cluster composed of a **driver pod** and one or more **executor pods**. Kubernetes acts as the **control plane**, while data movement and computation occur directly between Spark components.

##### Pod Model
- **One container per pod**
- **One pod equals one IP address**
- Pods are ephemeral and scoped to a single Spark job

This model aligns directly with Spark’s execution semantics and simplifies networking, observability, and failure isolation.


#### Core Components

##### Spark Driver Pod
- Single pod per Spark job
- Responsible for:
  - Job planning and task scheduling
  - Requesting and managing executor pods via Kubernetes API
  - Tracking execution state and retries
- Requires access to:
  - Kubernetes API
  - Object storage and metadata services
- Driver failure terminates the job

##### Spark Executor Pods
- One pod per executor
- Responsible for:
  - Executing tasks
  - Reading and writing data
  - Performing shuffle operations
- Stateless and short-lived
- Executor failure results in task retry, not job failure

##### Kubernetes Control Plane
- Manages pod lifecycle
- Receives executor creation and teardown requests from the driver
- Does not participate in data or shuffle traffic

##### Object Storage (e.g., ADLS Gen2)
- Primary persistence layer
- Stores:
  - Input data
  - Output data
  - Checkpoints and intermediate artifacts
- Accessed directly over HTTPS



#### Networking Model

##### Internal Cluster Communication
- **Driver ↔ Executors**
  - Direct pod-to-pod TCP communication
  - Used for task scheduling and control messages

- **Executor ↔ Executor**
  - High-throughput shuffle traffic
  - Remains entirely within the cluster network

No Kubernetes Services or load balancers are required for internal Spark communication.

###### External Communication
- **Driver / Executors → Object Storage**
  - Outbound HTTPS
  - Typically secured via Private Endpoint or Service Endpoint

- **Client → Driver (Optional)**
  - Job submission via:
    - `spark-submit` 
        - We can always scale on demand for ephemeral jobs we simply monitor the cluster and shutdown. That can be a flag on submission. 
        - Cluster reuse is always a good idea. Especially if we go to a pool model and have lower software/infrastructure costs. 
    - Spark Operator CRDs
    - Custom REST API
  - Ingress or LoadBalancer required only for:
    - Spark UI access
    - External job submission endpoints


##### AKS-Specific Considerations

- **Azure CNI**
  - Each pod receives a routable VNet IP
  - Enables direct pod-to-pod communication and private endpoint access

- **Identity**
  - Azure Workload Identity used for keyless authentication
  - Applies consistently to driver and executor pods

- **Security**
  - Executors require no inbound access
  - Network policies can restrict pod communication to required paths only


#### Operational Summary

Each Spark job dynamically creates a driver pod that provisions executor pods on demand, executes distributed computation entirely within Kubernetes, and persists results to object storage—using Kubernetes as a control plane, not a data plane.

