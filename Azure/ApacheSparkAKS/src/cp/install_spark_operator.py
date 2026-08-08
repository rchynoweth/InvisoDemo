import os
import subprocess
from dotenv import load_dotenv
from kubernetes import client, config

load_dotenv()

KUBECONFIG_PATH = os.path.expanduser(os.getenv("KUBECONFIG_PATH", "~/.kube/config"))

# Operator is typically installed into its own namespace
OP_NS = os.getenv("SPARK_OPERATOR_NAMESPACE", "spark-operator")
RELEASE = os.getenv("SPARK_OPERATOR_RELEASE", "spark-operator")
CHART = os.getenv("SPARK_OPERATOR_CHART", "spark-operator/spark-operator")


def run(cmd: list[str]):
    print("▶ " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def ensure_crd():
    config.load_kube_config(config_file=KUBECONFIG_PATH)
    ext = client.ApiextensionsV1Api()
    crds = ext.list_custom_resource_definition().items
    if not any(c.metadata.name == "sparkapplications.sparkoperator.k8s.io" for c in crds):
        raise RuntimeError("SparkApplication CRD still not found after install.")
    print("✅ SparkApplication CRD present")


def main():
    # 1) Add/refresh helm repo (official)
    run(["helm", "repo", "add", "--force-update", "spark-operator", "https://kubeflow.github.io/spark-operator"])
    run(["helm", "repo", "update"])

    # 2) Install operator (wait until ready)
    run([
        "helm", "install", RELEASE, CHART,
        "--namespace", OP_NS,
        "--create-namespace",
        "--wait",
    ])

    # 3) Verify CRD exists
    ensure_crd()

    print("\nNext:")
    print("  python hello_spark.py")


if __name__ == "__main__":
    main()
