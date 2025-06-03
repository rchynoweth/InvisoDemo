param (
    [string]$TenantId,
    [string]$ClientId,
    [string]$ClientSecret,
    [string]$WorkspaceId,
    [string]$LakehouseId,
    [string]$TargetDirectory = "",
    [string]$LocalPath = "."
)

# Generate timestamp prefix
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$now = Get-Date
$year = $now.Year
$month = "{0:D2}" -f $now.Month  # zero-padded
$day = "{0:D2}" -f $now.Day      # zero-padded
$hour = "{0:D2}" -f $now.hour      # zero-padded
$minute = "{0:D2}" -f $now.minute      # zero-padded
$second = "{0:D2}" -f $now.second      # zero-padded


# set environment variable for AzCopy
$env:AZCOPY_SPA_CLIENT_SECRET = $ClientSecret  # Adjust concurrency as needed

# Log in with Service Principal
Write-Host "Logging in with service principal..."
# azcopy login
azcopy login `
  --service-principal `
  --tenant-id $TenantId `
  --application-id $ClientId 

if ($LASTEXITCODE -ne 0) {
    Write-Error "Login failed."
    exit 1
}
# Build the destination base URL
$destinationBase = "https://onelake.blob.fabric.microsoft.com/$WorkspaceId/$LakehouseId/Files"
if ($TargetDirectory -ne "") {
    $destinationBase = "$destinationBase/$TargetDirectory"
}

# Get all files recursively in local path
$files = Get-ChildItem -Path $LocalPath -Recurse -File -Filter "*.csv"

foreach ($file in $files) {
    # Extract just the filename (no directories)
    $fileName = $file.Name
    $filenameNoExt = [System.IO.Path]::GetFileNameWithoutExtension($filename)
    $prefixedName = "$timestamp_$fileName"

    # Upload to flat destination with timestamp prefix
    $destinationUrl = "$destinationBase/$filenameNoExt/year=$year/month=$month/day=$day/$year$month$day$hour$minute$second`_$prefixedName" 


    Write-Host "Uploading $($file.FullName) → $destinationUrl"
    azcopy copy $file.FullName $destinationUrl --overwrite=true --trusted-microsoft-suffixes=onelake.blob.fabric.microsoft.com --log-level=DEBUG

}

# Logout to clean up cached tokens
azcopy logout
