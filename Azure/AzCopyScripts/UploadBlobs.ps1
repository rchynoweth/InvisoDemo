param (
    [string]$TenantId,
    [string]$ClientId,
    [string]$ClientSecret,
    [string]$StorageAccountName,
    [string]$ContainerName,
    [string]$TargetDirectory = "",
    [string]$LocalPath = "."
)

# Generate timestamp prefix
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$now = Get-Date
$year = $now.Year
$month = "{0:D2}" -f $now.Month  # zero-padded
$day = "{0:D2}" -f $now.Day      # zero-padded


# set environment variable for AzCopy
$env:AZCOPY_SPA_CLIENT_SECRET = $ClientSecret  # Adjust concurrency as needed

# Log in with Service Principal
Write-Host "Logging in with service principal..."
azcopy login `
  --service-principal `
  --tenant-id $TenantId `
  --application-id $ClientId #`
#   --client-secret $ClientSecret

if ($LASTEXITCODE -ne 0) {
    Write-Error "Login failed."
    exit 1
}

# Build the destination base URL
$destinationBase = "https://$StorageAccountName.dfs.core.windows.net/$ContainerName"
if ($TargetDirectory -ne "") {
    $destinationBase = "$destinationBase/$TargetDirectory"
}

# Get all files recursively in local path
$files = Get-ChildItem -Path $LocalPath -Recurse -File -Filter "*.txt"

foreach ($file in $files) {
    # Extract just the filename (no directories)
    $fileName = $file.Name
    $filenameNoExt = [System.IO.Path]::GetFileNameWithoutExtension($filename)
    $prefixedName = "$timestamp_$fileName"

    # Upload to flat destination with timestamp prefix
    $destinationUrl = "$destinationBase/$filenameNoExt/year=$year/month=$month/day=$day/$prefixedName"

    Write-Host "Uploading $($file.FullName) → $destinationUrl"
    azcopy copy $file.FullName $destinationUrl --overwrite=true
}

# Logout to clean up cached tokens
azcopy logout
