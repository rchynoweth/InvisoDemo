import pandas as pd
import numpy as np
import random

# Set seed for reproducibility
np.random.seed(42)
n_samples = 10000

# Create synthetic preprocessing data
df = pd.DataFrame({
    'batch_id': [f"{i+1}" for i in range(n_samples)],
    'initial_weight_kg': np.round(np.random.uniform(10, 25, n_samples), 2),
    'meat_temp_c': np.round(np.random.uniform(-4, 5, n_samples), 1),  # post-defrost temp
    'grind_size_mm': np.random.choice([3, 5, 8], n_samples),           # grinder options
    'water_ratio': np.round(np.random.uniform(0.05, 0.2, n_samples), 2),
    'fat_ratio': np.round(np.random.uniform(0.1, 0.3, n_samples), 2)
})

# Simulate yield loss ratio (pre-cook)
def simulate_weight_loss(row):
    # Assume baseline moisture/fat loss during grinding/mixing
    base_loss = 0.08
    temp_effect = -0.002 * row['meat_temp_c']       # colder meat = less loss
    grind_effect = 0.005 * (row['grind_size_mm'] - 3)  # finer grind = less loss
    water_effect = -0.05 * row['water_ratio']       # water added reduces % loss
    fat_effect = 0.1 * row['fat_ratio']             # more fat = higher loss
    total_loss_ratio = base_loss + temp_effect + grind_effect + water_effect + fat_effect
    total_loss_ratio = np.clip(total_loss_ratio, 0.02, 0.15) * random.uniform(0.5, 1.5)
    
    return np.round(row['initial_weight_kg'] * (1 - total_loss_ratio), 2)

df['final_weight_kg'] = df.apply(simulate_weight_loss, axis=1)

# Optional: add calculated yield loss for reference
df['yield_loss_ratio'] = np.round(1 - (df['final_weight_kg'] / df['initial_weight_kg']), 3)

print(df.head())

df.to_csv('YieldOptimization/data/preprocessing_data.csv', header=True)
