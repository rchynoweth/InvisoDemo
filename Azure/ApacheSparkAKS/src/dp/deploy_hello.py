import os
import time
from dotenv import load_dotenv

from kubernetes import client, config
from kubernetes.client.rest import ApiException

load_dotenv()

KUBECONFIG_PATH = os.getenv("KUBECONFIG_PATH", "aks-spark-poc.yaml")
NAMESPACE = os.getenv("K8S_NAMESPACE", "default")

DEPLOYMENT_NAME = "hello"
SERVICE_NAME = "hello"


def apply_deployment(apps: client.AppsV1Api):
    dep = client.V1Deployment(
        metadata=client.V1ObjectMeta(name=DEPLOYMENT_NAME),
        spec=client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels={"app": "hello"}),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels={"app": "hello"}),
                spec=client.V1PodSpec(
                    containers=[
                        client.V1Container(
                            name="hello",
                            image="nginxdemos/hello:plain-text",
                            ports=[client.V1ContainerPort(container_port=80)],
                        )
                    ]
                ),
            ),
        ),
    )

    try:
        apps.read_namespaced_deployment(DEPLOYMENT_NAME, NAMESPACE)
        apps.patch_namespaced_deployment(DEPLOYMENT_NAME, NAMESPACE, dep)
        print("✅ Deployment updated")
    except ApiException as e:
        if e.status == 404:
            apps.create_namespaced_deployment(NAMESPACE, dep)
            print("✅ Deployment created")
        else:
            raise


def apply_service(core: client.CoreV1Api):
    svc = client.V1Service(
        metadata=client.V1ObjectMeta(name=SERVICE_NAME),
        spec=client.V1ServiceSpec(
            type="LoadBalancer",
            selector={"app": "hello"},
            ports=[client.V1ServicePort(port=80, target_port=80)],
        ),
    )

    try:
        core.read_namespaced_service(SERVICE_NAME, NAMESPACE)
        core.patch_namespaced_service(SERVICE_NAME, NAMESPACE, svc)
        print("✅ Service updated")
    except ApiException as e:
        if e.status == 404:
            core.create_namespaced_service(NAMESPACE, svc)
            print("✅ Service created")
        else:
            raise


def wait_for_external_endpoint(core: client.CoreV1Api, timeout_s: int = 600) -> str:
    print("⏳ Waiting for LoadBalancer external endpoint...")
    start = time.time()

    while time.time() - start < timeout_s:
        s = core.read_namespaced_service(SERVICE_NAME, NAMESPACE)
        ing = (s.status.load_balancer.ingress or [])
        if ing:
            ip = getattr(ing[0], "ip", None)
            hostname = getattr(ing[0], "hostname", None)
            if ip:
                return f"http://{ip}/"
            if hostname:
                return f"http://{hostname}/"
        time.sleep(5)

    raise TimeoutError("Timed out waiting for external LoadBalancer endpoint.")


def main():
    config.load_kube_config(config_file=KUBECONFIG_PATH)

    apps = client.AppsV1Api()
    core = client.CoreV1Api()

    apply_deployment(apps)
    apply_service(core)

    url = wait_for_external_endpoint(core, timeout_s=900)
    print(f"\n✅ Hello World reachable at: {url}")
    print(f"Test with: curl {url}")


if __name__ == "__main__":
    main()
