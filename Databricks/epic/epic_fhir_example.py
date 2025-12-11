# The SMART team runs a public Bulk FHIR server specifically for testing $export:
# Base URL: https://bulk-data.smarthealthit.org/fhir  - bulk-data.smarthealthit.org
    # Supports $export, Patient/$export, etc.
    # Can be configured with different numbers of synthetic patients.
    # No auth required by default → perfect for a demo.
    # The export/poll logic can be used with EPIC Export functions


import time
import json
import requests


FHIR_BASE_URL = "https://bulk-data.smarthealthit.org/fhir"

# e.g. system-level export
EXPORT_URL = f"{FHIR_BASE_URL}/$export"

def start_bulk_export():
    """
    Kick off a bulk $export job against the SMART Bulk Data sandbox.
    No auth needed by default.
    """
    headers = {
        "Accept": "application/fhir+json",
        "Prefer": "respond-async",
    }

    params = {
        # What resource types you want:
        "_type": "Patient,Encounter,Observation",
        # "_since": "2020-01-01T00:00:00Z",  # optional, for incremental exports
    }

    resp = requests.get(EXPORT_URL, headers=headers, params=params)
    print("Kickoff status:", resp.status_code)
    print("Kickoff headers:", resp.headers)

    resp.raise_for_status()

    status_url = resp.headers.get("Content-Location")
    if not status_url:
        raise ValueError("No Content-Location header returned – cannot poll export job.")
    print("Status URL:", status_url)
    return status_url


def poll_bulk_export(status_url: str, poll_interval: int = 5):
    """
    Polls the status URL until the job completes.
    Returns the export manifest JSON.
    """
    headers = {
        "Accept": "application/json",
    }

    while True:
        resp = requests.get(status_url, headers=headers)
        print("Poll status:", resp.status_code)

        if resp.status_code == 202:
            # Still working
            print("Export still running...")
            time.sleep(poll_interval)
            continue

        if resp.status_code == 200:
            print("Export complete.")
            manifest = resp.json()
            print("Manifest:", json.dumps(manifest, indent=2))
            return manifest

        print("Export failed:")
        print(resp.text)
        resp.raise_for_status()


def download_bulk_files(manifest: dict, output_folder: str = "smart_bulk_output"):
    """
    Downloads NDJSON files from the manifest.
    SMART sandbox exposes them as unauthenticated HTTPS URLs.
    """
    import os
    os.makedirs(output_folder, exist_ok=True)

    files = []
    for entry in manifest.get("output", []):
        resource_type = entry["type"]
        url = entry["url"]

        print(f"Downloading {resource_type} from {url}")
        resp = requests.get(url, stream=True)
        resp.raise_for_status()

        local_path = os.path.join(output_folder, f"{resource_type}.ndjson")
        with open(local_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        files.append(local_path)
        print("Saved:", local_path)

    return files


if __name__ == "__main__":
    print("Starting SMART Bulk FHIR export demo...")
    status_url = start_bulk_export()
    manifest = poll_bulk_export(status_url)
    files = download_bulk_files(manifest)

    print("\nDownloaded NDJSON files:")
    for f in files:
        print(" -", f)
