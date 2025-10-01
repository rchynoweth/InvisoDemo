import os 
import pandas as pd


file_path = ""

for f in os.listdir(file_path):
    print(f)


data = []
for fname in os.listdir(file_path):
    fpath = os.path.join(file_path, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    data.append({"filename": fname, "content": content})

df = pd.DataFrame(data)


df.head()

df.to_csv("output.csv",index=False, quoting=1) 


