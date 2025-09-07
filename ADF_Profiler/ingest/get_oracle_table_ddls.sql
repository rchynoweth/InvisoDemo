--- this is each column as a row
SELECT
    OWNER,
    TABLE_NAME,
    COLUMN_ID,
    COLUMN_NAME,
    DATA_TYPE,
    DATA_LENGTH,
    DATA_PRECISION,
    DATA_SCALE,
    NULLABLE
FROM ALL_TAB_COLUMNS
WHERE OWNER IN ('<schema names>')
ORDER BY OWNER, TABLE_NAME, COLUMN_ID;



-- this is the create table statements 
SELECT DBMS_METADATA.GET_DDL('TABLE', t.table_name, t.owner) AS TableDDL
FROM ALL_TABLES t
WHERE OWNER NOT IN ('SYS', 'SYSTEM')  -- filter out system schemas
ORDER BY OWNER, TABLE_NAME;
