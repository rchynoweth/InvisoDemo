SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    c.column_id,
    c.name AS ColumnName,
    ty.name AS DataType,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable
FROM sys.tables t
JOIN sys.columns c
    ON t.object_id = c.object_id
JOIN sys.types ty
    ON c.user_type_id = ty.user_type_id
ORDER BY SchemaName, TableName, c.column_id;
