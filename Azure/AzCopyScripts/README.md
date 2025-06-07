

Run the following command.  
```
.\UploadBlobs.ps1 `
  -TenantId "<your-tenant-id>" `
  -ClientId "<your-app-id>" `
  -ClientSecret "<your-app-secret>" `
  -StorageAccountName "ryanstorageadls" `
  -ContainerName "demo" `
  -TargetDirectory "point_of_sale"
```
OneLake Command.
```

.\UploadBlobsOneLake.ps1 `
  -TenantId "<your-tenant-id>" `
  -ClientId "<your-app-id>" `
  -ClientSecret "<your-app-secret>" `
  -WorkspaceId "<your-workspace-id>" `
  -LakehouseId "<your-lakehouse-id>" `
  -TargetDirectory "point_of_sale"
```


The directory structure would be as follows: 
```
container/
└── point_of_sale/
    └── headers/
            └── year=2025/
                └── month=06/
                    └── day=01/
                        ├── 20250601000000_headers.csv
                        ├── 20250601010000_headers.csv
                        ├── 20250601020000_headers.csv
                        ├── ...
                        └── 20250601230000_headers.csv
                    └── day=02/
                        ├── 20250602000000_headers.csv
                        ├── 20250602010000_headers.csv
                        ├── 20250602020000_headers.csv
                        ├── ...
                        └── 20250602230000_headers.csv
    └── line_items/
            └── year=2025/
                └── month=06/
                    └── day=01/
                        ├── 20250601000000_line_items.csv
                        ├── 20250601010000_line_items.csv
                        ├── 20250601020000_line_items.csv
                        ├── ...
                        └── 20250601230000_line_items.csv
                    └── day=02/
                        ├── 20250602000000_line_items.csv
                        ├── 20250602010000_line_items.csv
                        ├── 20250602020000_line_items.csv
                        ├── ...
                        └── 20250602230000_line_items.csv

```