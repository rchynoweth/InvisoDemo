# Azure Data Factory / Synapse Pipelines Profiler 


APIs
- https://learn.microsoft.com/en-us/rest/api/synapse/data-plane/pipeline/get-pipelines-by-workspace?view=rest-synapse-data-plane-2020-12-01
- https://learn.microsoft.com/en-us/rest/api/synapse/data-plane/pipeline-run/query-pipeline-runs-by-workspace?view=rest-synapse-data-plane-2020-12-01
- https://learn.microsoft.com/en-us/rest/api/synapse/data-plane/linked-service/get-linked-services-by-workspace?view=rest-synapse-data-plane-2020-12-01 



SQL Querys:
- I need access to a subset of the system tables so that I can pull stored procedure information. 
    - Counts
    - Querys for line and table count complexity analysis - could be a use case to leverage an llm
- Must be able to list and view definitions of all views in the data warehouse 
- Must be able to list and view definitions of all functions
- https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-procedures-transact-sql
- https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-objects-transact-sql
- https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-views-transact-sql



Power BI - Connects to Oracle using a lot of Dataflows. 
Oracle has RLS. 
