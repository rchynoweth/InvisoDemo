import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/oracle_tables_detail.json" ]

# read and concatenate all json files
df = pd.read_json(files[0], )
for f in files[1:]:
    temp_df = pd.read_json(f)
    df = pd.concat([df, temp_df], ignore_index=True)


df.head()
len(df)

# parse out some data 
df["schema"] = df["data"].apply(lambda x: x["OWNER"])
df["table_name"] = df["data"].apply(lambda x: x["TABLE_NAME"])
df["column_name"] = df["data"].apply(lambda x: x["COLUMN_NAME"])
df["data_type"] = df["data"].apply(lambda x: x["DATA_TYPE"])
df["data_length"] = df["data"].apply(lambda x: x["DATA_LENGTH"])
df["data_precision"] = df["data"].apply(lambda x: x["DATA_PRECISION"])
df["data_scale"] = df["data"].apply(lambda x: x["DATA_SCALE"])
df["nullable"] = df["data"].apply(lambda x: x["NULLABLE"])
df["column_id"] = df["data"].apply(lambda x: x["COLUMN_ID"])
df['qualified_table_name'] = df['schema'] + '.' + df['table_name']

df.head()


df.columns

output_cols = ['qualified_table_name', 'num_cols']
result = df.groupby("qualified_table_name").size().reset_index(name="num_columns")
result.head()


result.to_csv(f"{output_folder}/oracle_table_summary.csv", index=False)

