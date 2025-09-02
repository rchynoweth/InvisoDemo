import pandas as pd
import itertools
import dotenv
import os 

dotenv.load_dotenv('./ADF_Profiler/.env')
output_folder = os.getenv("output_folder")

# List your files
files = [f"{output_folder}/synapse_pipelines_0.json", 
         f"{output_folder}/synapse_pipelines_1.json"
         ]

# read and concatenate all json files
df = pd.read_json(files[0])
for f in files[1:]:
    temp_df = pd.read_json(f)
    df = pd.concat([df, temp_df], ignore_index=True)


# df.head()
# len(df)
# df.iloc[0]['value']


# parse out some data 
df["id"] = df["value"].apply(lambda x: x["id"])
df["pipeline_name"] = df["value"].apply(lambda x: x["name"])
df["object_type"] = df["value"].apply(lambda x: x["type"])
df["num_activities"] = df["value"].apply(lambda x: len(x["properties"]["activities"]))
df["activity_types"] = df["value"].apply(lambda x: [a["type"] for a in x["properties"]["activities"]])


##### 
## Handle ForEach activities specially because they can have a lot of children
#####

def summarize_foreach(activities):
    """Return info only about ForEach blocks."""
    results = []
    for act in activities:
        if act["type"].lower() == "foreach":
            children = act.get("typeProperties", {}).get("activities", [])
            results.append({
                "foreach_name": act["name"],
                "foreach_num_activities": len(children),
                "foreach_activity_types": [c["type"] for c in children]
            })
    return results


# get the rows to apply the foreach summary function to
mask = df["activity_types"].apply(lambda acts: "ForEach" in acts)
# Apply only to pipelines with ForEach
df.loc[mask, "foreach_details"] = df.loc[mask, "value"].apply(
    lambda x: summarize_foreach(x["properties"]["activities"])
)


#####
## Get the activity count for the pipelines
#####
def total_activity_count(row):
    # start with top-level count
    total = len(row["activity_types"])
    # add foreach_num_activities if any
    if isinstance(row.get("foreach_details"), list):
        total += sum(fd["foreach_num_activities"] for fd in row["foreach_details"])
    return total

df["total_activity_count"] = df.apply(total_activity_count, axis=1)


#####
## Get the activity types for the pipelines
#####
def distinct_activity_types(row):
    types = set(row["activity_types"])
    if isinstance(row.get("foreach_details"), list):
        # flatten list of foreach_activity_types
        foreach_types = itertools.chain.from_iterable(
            fd["foreach_activity_types"] for fd in row["foreach_details"]
        )
        types.update(foreach_types)
    return sorted(types)

df["distinct_activity_types"] = df.apply(distinct_activity_types, axis=1)



##### 
## Placeholder Comment - likely want to be able to understand the
## pipeline dependecies on one another and parse out jobs that call jobs
#####



#####
## Format the output dataframe
#####
# df.columns
output_cols = ['id','pipeline_name', 'object_type', 'num_activities',
       'activity_types', 'foreach_details', 'total_activity_count',
       'distinct_activity_types']


df_final = df[output_cols]


# save to CSV
df_final.to_csv("C:/gitmine/InvisoDemo/Azure/ADF_Profiler/data/synapse_pipelines_summary.csv", index=False)