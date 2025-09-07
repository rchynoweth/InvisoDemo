SELECT 
    SCHEMA_NAME(p.schema_id) AS SchemaName,
    p.name AS ProcedureName,
    m.definition AS ProcedureDefinition
FROM sys.procedures p
JOIN sys.sql_modules m
    ON p.object_id = m.object_id
ORDER BY SchemaName, ProcedureName;
