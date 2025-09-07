SELECT 
    SCHEMA_NAME(v.schema_id) AS SchemaName,
    v.name AS ViewName,
    m.definition AS ViewDefinition
FROM sys.views v
JOIN sys.sql_modules m
    ON v.object_id = m.object_id
ORDER BY SchemaName, ViewName;
