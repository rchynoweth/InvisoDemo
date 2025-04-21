from scipy.optimize import minimize
import numpy as np
import joblib

# Load the pre-trained model
model = joblib.load('YieldOptimization/data/yield_predictor_model.pkl')

# Define the features
features = ['initial_weight_kg', 'meat_temp_c', 'grind_size_mm', 'water_ratio', 'fat_ratio']

# Objective: minimize the yield loss (initial - predicted final weight)
def objective(x, model):
    # x = [initial_weight, meat_temp, grind_size, water_ratio, fat_ratio]
    input_features = np.array(x).reshape(1, -1)
    predicted_final_weight = model.predict(input_features)[0]
    initial_weight = x[0]
    yield_loss = initial_weight - predicted_final_weight
    return yield_loss

# Bounds and reasonable starting guess
bounds = [
    (10, 25),     # initial_weight_kg
    (-4, 5),      # meat_temp_c
    (3, 8),       # grind_size_mm
    (0.05, 0.2),  # water_ratio
    (0.1, 0.3),   # fat_ratio
]

# Starting guess (initial guess for optimization)
x0 = [18, 0, 5, 0.12, 0.18]  # example initial guess

# Optimize
result = minimize(objective, x0, args=(model,), bounds=bounds, method='L-BFGS-B')

# Get the optimal inputs found by the optimizer
optimal_inputs = result.x

# Round grind_size_mm to the closest allowed value
grind_size_mm_options = [3, 5, 8]
optimal_inputs[2] = min(grind_size_mm_options, key=lambda v: abs(v - optimal_inputs[2]))

# Predict the final weight using the optimal inputs
predicted_weight = model.predict(np.array(optimal_inputs).reshape(1, -1))[0]

# Calculate yield loss
initial_weight = optimal_inputs[0]
yield_loss = initial_weight - predicted_weight

# Print results
print("Optimal Inputs:")
for name, val in zip(features, optimal_inputs):
    print(f"  {name}: {val:.3f}")

print(f"\nPredicted Final Weight: {predicted_weight:.2f} kg")
print(f"Yield Loss: {yield_loss:.2f} kg ({(yield_loss/initial_weight)*100:.2f}%)")
