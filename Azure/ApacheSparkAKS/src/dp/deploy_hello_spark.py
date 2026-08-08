import os
import time
import subprocess
from dotenv import load_dotenv

from kubernetes import client, config
from kubernetes.client.rest import ApiException

load_dotenv()

KUBECONFIG_PATH = os.path.expanduser(os.getenv("KUBECONFIG_PATH", "~/.kube/aks-spark-poc.yaml"))

# Spark Operator install (runs in AKS)
SPARK_OPERATOR_NAMESPACE = os.getenv("SPARK_OPERATOR_NAMESPACE", "spark-operator")
SPARK_OPERATOR_RELEASE = os.getenv("SPARK_OPERATOR_RELEASE", "spark-operator")

# Spark job namespace + identity
SPARK_NAMESPACE = os.getenv("SPARK_NAMESPACE", "spark")
SPARK_SERVICE_ACCOUNT = os.getenv("SPARK_SERVICE_ACCOUNT", "spark")

# Spark job settings
SPARK_APP_NAME = os.getenv("SPARK_APP_NAME", "hello-spark")
SPARK_IMAGE = os.getenv("SPARK_IMAGE", "ghcr.io/apache/spark-kubernetes-operator/spark:v3.5.1")
SPARK_VERSION = os.getenv("SPARK_VERSION", "3.5.1")

# SparkApplication CRD location
GROUP = "sparkoperator.k8s.io"
VERSION = "v1beta2"
PLURAL = "sparkapplications"
CRD_NAME = "sparkapplications.sparkoperator.k8s.io"


def helm(cmd: list[str]):
    env = os.environ.copy()
    env["KUBECONFIG"] = KUBECONFIG_PATH  # critical: prevents localhost:8080
    print("▶ " + " ".join(cmd))
    subprocess.run(cmd, check=True, env=env)


def ensure_namespace(core: client.CoreV1Api, name: str):
    try:
        core.read_namespace(name)
    except ApiException as e:
        if e.status == 404:
            core.create_namespace(client.V1Namespace(metadata=client.V1ObjectMeta(name=name)))
        else:
            raise


def ensure_serviceaccount(core: client.CoreV1Api, name: str, namespace: str):
    try:
        core.read_namespaced_service_account(name, namespace)
    except ApiException as e:
        if e.status == 404:
            core.create_namespaced_service_account(
                namespace,
                client.V1ServiceAccount(metadata=client.V1ObjectMeta(name=name)),
            )
        else:
            raise


def spark_crd_exists(ext: client.ApiextensionsV1Api) -> bool:
    crds = ext.list_custom_resource_definition().items
    return any(c.metadata.name == CRD_NAME for c in crds)


def install_spark_operator_if_missing():
    config.load_kube_config(config_file=KUBECONFIG_PATH)
    ext = client.ApiextensionsV1Api()

    if spark_crd_exists(ext):
        print("✅ SparkApplication CRD already present (Spark Operator installed).")
        return

    print("▶ Installing Spark Operator (Helm) into AKS...")
    helm(["helm", "repo", "add", "--force-update", "spark-operator", "https://kubeflow.github.io/spark-operator"])
    helm(["helm", "repo", "update"])
    helm([
        "helm", "install", SPARK_OPERATOR_RELEASE, "spark-operator/spark-operator",
        "--namespace", SPARK_OPERATOR_NAMESPACE,
        "--create-namespace",
        "--wait",
    ])

    # Verify CRD after install
    ext = client.ApiextensionsV1Api()
    if not spark_crd_exists(ext):
        raise RuntimeError("Spark operator install finished but SparkApplication CRD not found.")
    print("✅ Spark Operator installed (CRD found).")


def spark_application_manifest() -> dict:
    # Runs the built-in Spark example pi.py inside the Spark image
    return {
        "apiVersion": f"{GROUP}/{VERSION}",
        "kind": "SparkApplication",
        "metadata": {"name": SPARK_APP_NAME, "namespace": SPARK_NAMESPACE},
        "spec": {
            "type": "Python",
            "mode": "cluster",
            "image": SPARK_IMAGE,
            "imagePullPolicy": "IfNotPresent",
            "sparkVersion": SPARK_VERSION,
            "mainApplicationFile": "local:///opt/spark/examples/src/main/python/pi.py",
            "arguments": ["1000"],
            "restartPolicy": {"type": "Never"},
            "driver": {
                "serviceAccount": SPARK_SERVICE_ACCOUNT,
                "cores": 1,
                "memory": "1g",
                "labels": {"app": SPARK_APP_NAME, "spark-role": "driver"},
            },
            "executor": {
                "instances": 2,
                "cores": 1,
                "memory": "1g",
                "labels": {"app": SPARK_APP_NAME, "spark-role": "executor"},
            },
        },
    }


def submit_spark_app_and_wait(timeout_s: int = 1200) -> str:
    config.load_kube_config(config_file=KUBECONFIG_PATH)
    core = client.CoreV1Api()
    co = client.CustomObjectsApi()

    ensure_namespace(core, SPARK_NAMESPACE)
    ensure_serviceaccount(core, SPARK_SERVICE_ACCOUNT, SPARK_NAMESPACE)

    manifest = spark_application_manifest()

    # Create or patch
    try:
        co.get_namespaced_custom_object(GROUP, VERSION, SPARK_NAMESPACE, PLURAL, SPARK_APP_NAME)
        co.patch_namespaced_custom_object(GROUP, VERSION, SPARK_NAMESPACE, PLURAL, SPARK_APP_NAME, manifest)
        print(f"✅ Updated SparkApplication: {SPARK_APP_NAME}")
    except ApiException as e:
        if e.status == 404:
            co.create_namespaced_custom_object(GROUP, VERSION, SPARK_NAMESPACE, PLURAL, manifest)
            print(f"✅ Created SparkApplication: {SPARK_APP_NAME}")
        else:
            raise

    print("⏳ Waiting for Spark job to finish...")
    start = time.time()
    while time.time() - start < timeout_s:
        obj = co.get_namespaced_custom_object(GROUP, VERSION, SPARK_NAMESPACE, PLURAL, SPARK_APP_NAME)
        state = (obj.get("status", {}).get("applicationState") or {}).get("state")
        if state in {"COMPLETED", "FAILED"}:
            print(f"✅ SparkApplication finished: {state}")
            return state
        time.sleep(5)

    raise TimeoutError("Timed out waiting for SparkApplication completion.")


def main():
    install_spark_operator_if_missing()
    state = submit_spark_app_and_wait()
    if state != "COMPLETED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
