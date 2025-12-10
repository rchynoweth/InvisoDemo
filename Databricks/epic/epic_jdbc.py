# 1. JDBC connection details for Caboodle on Azure SQL
jdbc_hostname = "<your-sql-server-name>.database.windows.net"
jdbc_port = "1433"
jdbc_database = "<caboodle_database_name>"

jdbc_url = (
    f"jdbc:sqlserver://{jdbc_hostname}:{jdbc_port};"
    f"database={jdbc_database};"
    "encrypt=true;"
    "trustServerCertificate=false;"
    "hostNameInCertificate=*.database.windows.net;"
    "loginTimeout=30;"
)

# 2. Credentials pulled from Databricks secrets (replace with your scope and keys)
caboodle_user = dbutils.secrets.get("caboodle-scope", "caboodle-user")
caboodle_password = dbutils.secrets.get("caboodle-scope", "caboodle-password")

connection_properties = {
    "user": caboodle_user,
    "password": caboodle_password,
    "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
}

# 3. Choose a Caboodle table or view to ingest
#    Example: a dimension or fact table such as dbo.DimPatient or dbo.FactEncounter
caboodle_table = "dbo.DimPatient"  # change to the table or view you need

# 4. Read from Caboodle into a Spark DataFrame
# https://learn.microsoft.com/en-us/azure/databricks/ingestion/lakeflow-connect/sql-server-pipeline#option-1-azure-databricks-ui
# https://docs.azure.cn/en-us/databricks/archive/connectors/sql-server # - this is archived but is what the other connectors leverage under the hood. 
# https://docs.databricks.com/aws/en/query-federation/sql-server
caboodle_df = (
    spark.read
    .format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", caboodle_table)
    .option("user", connection_properties["user"])
    .option("password", connection_properties["password"])
    .option("driver", connection_properties["driver"])
    .load()
)

# 5. Write to Delta Lake for downstream analytics
#    You can change the table name or path to match your bronze layer conventions
caboodle_df.write.saveAsTable("bronze_caboodle_dim_patient")
