import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/oracle_stored_procedures.json" ]

# read and concatenate all json files
df = pd.read_json(files[0])
for f in files[1:]:
    temp_df = pd.read_json(f)
    df = pd.concat([df, temp_df], ignore_index=True)


df.head()
len(df)

# parse out some data 
df["schema"] = df["data"].apply(lambda x: x["OWNER"])
df["object_name"] = df["data"].apply(lambda x: x["OBJECTNAME"])
df["object_type"] = df["data"].apply(lambda x: x["OBJECTTYPE"])
df["object_length"] = df["data"].apply(lambda x: len(x["SOURCECODE"]))
df['qualified_object_name'] = df['schema'] + '.' + df['object_name']

df.head()


output_cols = ['qualified_object_name', 'object_type', 'object_length']
result = df[output_cols][:]


result.to_csv(f"{output_folder}/oracle_stored_proc_summary.csv", index=False)

