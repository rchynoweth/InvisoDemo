import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

df = pd.read_csv('YieldOptimization/data/preprocessing_data.csv')

# Step 2: Prepare data for ML
features = ['initial_weight_kg', 'meat_temp_c', 'grind_size_mm', 'water_ratio', 'fat_ratio']
target = 'final_weight_kg'

X = df[features]
y = df[target]

# Step 3: Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 4: Train a regression model
model = LinearRegression()
model.fit(X_train, y_train)

# Save the trained model
joblib.dump(model, 'YieldOptimization/data/yield_predictor_model.pkl')

# Step 5: Evaluate
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
rmse = mse**0.5
r2 = r2_score(y_test, y_pred)

print(f"RMSE: {rmse:.2f} kg")
print(f"R² Score: {r2:.3f}")

# Step 6: Plot results
plt.figure(figsize=(6, 6))
sns.scatterplot(x=y_test, y=y_pred)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], '--', color='gray')
plt.xlabel("Actual Final Weight (kg)")
plt.ylabel("Predicted Final Weight (kg)")
plt.title("Model Performance: Actual vs Predicted")
plt.grid(True)
plt.tight_layout()
plt.show()