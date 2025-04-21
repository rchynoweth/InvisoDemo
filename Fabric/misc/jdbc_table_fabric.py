
table_schema = ''
table_name = ''
database_url = ''
user = ''
password = ''

spark.sql(f"""CREATE TABLE IF NOT EXISTS {table_name}
  USING JDBC
  OPTIONS (
    url '{database_url}',
    dbtable '{table_schema}.{table_name}',
    user '{user}',
    password '{password}'
);
""")

display(spark.sql(f"select * from {table_name}"))