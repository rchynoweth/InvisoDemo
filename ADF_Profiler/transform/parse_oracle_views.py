import pandas as pd
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files =  [ f"{output_folder}/oracle_views.json" ]

# read and concatenate all json files
df = pd.read_json(files[0])
for f in files[1:]:
    temp_df = pd.read_json(f)
    df = pd.concat([df, temp_df], ignore_index=True)


df.head()
len(df)

# parse out some data 
df["schema"] = df["data"].apply(lambda x: x["OWNER"])
df["view_name"] = df["data"].apply(lambda x: x["VIEW_NAME"])
df["view_length"] = df["data"].apply(lambda x: len(x["VIEWDEFINITION"]))
df['qualified_object_name'] = df['schema'] + '.' + df['view_name']

df.head()


output_cols = ['qualified_object_name', 'view_length']
result = df[output_cols][:]


result.to_csv(f"{output_folder}/oracle_view_summary.csv", index=False)

