import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/synapse_sqlscripts_0.json" ]

# read and concatenate all json files
df = pd.read_json(files[0])
for f in files[1:]:
    temp_df = pd.read_json(f)
    df = pd.concat([df, temp_df], ignore_index=True)


df.head()
len(df)
df.iloc[0]['value']


# parse out some data 
df["id"] = df["value"].apply(lambda x: x["id"])
df["script_name"] = df["value"].apply(lambda x: x["name"])
df["object_type"] = df["value"].apply(lambda x: x["type"])
df["query_lines"] = df["value"].apply(lambda x: x["properties"].get("content", None).get("query", None).count("\n") )
df["current_connection_db"] = df["value"].apply(lambda x: x["properties"].get("content", None).get("currentConnection", None).get("databaseName", None))
df["current_connection_pool"] = df["value"].apply(lambda x: x["properties"].get("content", None).get("currentConnection", None).get("poolName", None))
df.head()


#####
## Estimate the number of tables used/touched in the script
#####
def count_tables_used(script):
    """A very naive way to count tables used in a SQL script."""
    if script is None:
        return 0
    # This is very naive and can be improved with regex or SQL parsing libraries
    keywords = ["from ", "join ", "update ", "into "]
    count = 0
    script_lower = script.lower()
    for kw in keywords:
        count += script_lower.count(kw)
    return count

df["query_table_cnt_estimate"] = df["value"].apply(lambda x: count_tables_used(x["properties"].get("content", None).get("query", None)) )



output_cols = ['id', 'object_type', 'script_name', 
               'query_lines', 'current_connection_db', 
               'current_connection_pool', 'query_table_cnt_estimate'
               ]


df_final = df[output_cols]
df_final.head(20)
df_final.to_csv(f"{output_folder}/synapse_sqlscripts_summary.csv", index=False)

