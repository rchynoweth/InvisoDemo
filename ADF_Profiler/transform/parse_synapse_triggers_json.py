import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/synapse_triggers_0.json" ]

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
df["trigger_name"] = df["value"].apply(lambda x: x["name"])
df["object_type"] = df["value"].apply(lambda x: x["type"])
df["trigger_type"] = df["value"].apply(lambda x: x["properties"].get("type", None))
df["trigger_state"] = df["value"].apply(lambda x: x["properties"].get("runtimeState", None))
df["trigger_properties"] = df["value"].apply(lambda x: x["properties"].get("typeProperties", None))
df["pipeline_count"] = df["value"].apply(lambda x: len(x["properties"].get("pipelines", [])))
df.head()


df.columns

output_cols = ['id', 'object_type', 'trigger_name', 
               'trigger_type', 'trigger_state', 
               'pipeline_count', 'trigger_properties'
               ]


df_final = df[output_cols]
df_final.head(20)
df_final.to_csv(f"{output_folder}/synapse_triggers_summary.csv", index=False)

