SELECT
    SCHEMA_NAME(o.schema_id) AS SchemaName,
    o.name AS FunctionName,
    o.type_desc AS FunctionType,
    m.definition AS FunctionDefinition
FROM sys.objects o
JOIN sys.sql_modules m
    ON o.object_id = m.object_id
WHERE o.type IN ('FN', 'TF', 'IF')   -- FN = scalar, TF = table-valued, IF = inline table-valued
ORDER BY SchemaName, FunctionName;
