
import pandas as pd

df = pd.read_csv("ASTRAM_event_data.csv")
print(df.columns.tolist())
print(df.head())