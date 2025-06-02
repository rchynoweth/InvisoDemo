

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



The directory structure would be as follows: 
```
container/
└── point_of_sale/
    └── headers/
            └── year=2025/
                └── month=06/
                    └── day=01/
                        ├── headers_20250601000000.parquet
                        ├── headers_20250601010000.parquet
                        ├── headers_20250601020000.parquet
                        ├── ...
                        └── headers_20250601230000.parquet
                    └── day=02/
                        ├── headers_20250602000000.parquet
                        ├── headers_20250602010000.parquet
                        ├── headers_20250602020000.parquet
                        ├── ...
                        └── headers_20250602230000.parquet
    └── lines/
            └── year=2025/
                └── month=06/
                    └── day=01/
                        ├── lines_20250601000000.parquet
                        ├── lines_20250601010000.parquet
                        ├── lines_20250601020000.parquet
                        ├── ...
                        └── lines_20250601230000.parquet
                    └── day=02/
                        ├── lines_20250602000000.parquet
                        ├── lines_20250602010000.parquet
                        ├── lines_20250602020000.parquet
                        ├── ...
                        └── lines_20250602230000.parquet

```