import numpy as np
import pandas as pd
import joblib

model = joblib.load('YieldOptimization/data/yield_predictor_model.pkl')


# Sample data (each row = one batch)
sample_data = pd.DataFrame([
    {
        "initial_weight_kg": 18.0,
        "meat_temp_c": 2.0,
        "grind_size_mm": 5,
        "water_ratio": 0.12,
        "fat_ratio": 0.18,
    },
    {
        "initial_weight_kg": 20.0,
        "meat_temp_c": 0.0,
        "grind_size_mm": 3,
        "water_ratio": 0.10,
        "fat_ratio": 0.22,
    }
])

# Predict final weights
sample_data["predicted_final_weight_kg"] = model.predict(sample_data)

# Compute yield loss
sample_data["yield_loss_kg"] = sample_data["initial_weight_kg"] - sample_data["predicted_final_weight_kg"]
sample_data["yield_loss_pct"] = (sample_data["yield_loss_kg"] / sample_data["initial_weight_kg"]) * 100

# Display results
print(sample_data)
