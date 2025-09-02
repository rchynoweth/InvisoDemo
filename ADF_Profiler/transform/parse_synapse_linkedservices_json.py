import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/synapse_linked_services_0.json" ]

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
df["linked_service_name"] = df["value"].apply(lambda x: x["name"])
df["object_type"] = df["value"].apply(lambda x: x["type"])
df["ls_type"] = df["value"].apply(lambda x: x["properties"].get("type", None))
df.head()


df.columns

output_cols = ['id', 'object_type', 'linked_service_name', 'ls_type']


df_final = df[output_cols]
df_final.head(20)
df_final.to_csv(f"{output_folder}/synapse_linkedservices_summary.csv", index=False)

