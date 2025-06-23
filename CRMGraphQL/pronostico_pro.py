# pronostico_pro.py

import json
import pandas as pd
import numpy as np
import sys
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error

# -------------------------------
# ✅ Validar argumentos
# -------------------------------
if len(sys.argv) != 2:
    print(json.dumps({"error": "Uso: python pronostico_pro.py <archivo_json>"}))
    sys.exit(1)

input_path = sys.argv[1]

# -------------------------------
# ✅ Leer archivo JSON
# -------------------------------
try:
    with open(input_path, "r", encoding="utf-8") as f:
        content = json.load(f)
except Exception as e:
    print(json.dumps({"error": f"No se pudo leer el archivo: {str(e)}"}))
    sys.exit(1)

# -------------------------------
# ✅ Validar claves necesarias
# -------------------------------
required_keys = ['data', 'target', 'features', 'modelo']
if not all(k in content for k in required_keys):
    print(json.dumps({"error": f"Faltan claves necesarias en el JSON: {required_keys}"}))
    sys.exit(1)

df = pd.DataFrame(content['data'])
target = content['target'].strip()
features = [f.strip() for f in content['features']]
modelo = content['modelo'].strip().lower()

# -------------------------------
# ✅ Aplicar filtros opcionales
# -------------------------------
cliente = content.get('cliente')
producto = content.get('producto')

if cliente and 'Nombre del cliente' in df.columns:
    df = df[df['Nombre del cliente'] == cliente]
if producto and 'Producto' in df.columns:
    df = df[df['Producto'] == producto]

# -------------------------------
# ✅ Verificar columnas existentes
# -------------------------------
if target not in df.columns:
    print(json.dumps({"error": f"La columna objetivo '{target}' no existe en los datos."}))
    sys.exit(1)

for f in features:
    if f not in df.columns:
        print(json.dumps({"error": f"La columna predictora '{f}' no existe en los datos."}))
        sys.exit(1)

# -------------------------------
# ✅ Limpieza y conversión
# -------------------------------
df = df[features + [target]]

try:
    X = df[features].apply(pd.to_numeric, errors='coerce')
    y = pd.to_numeric(df[target], errors='coerce')

    df_limpio = pd.concat([X, y.rename(target)], axis=1).dropna()
    X = df_limpio[features]
    y = df_limpio[target]

except Exception as e:
    print(json.dumps({"error": f"Error al convertir datos a numérico: {str(e)}"}))
    sys.exit(1)

if len(X) < 10:
    print(json.dumps({"error": "No hay suficientes datos válidos para entrenar."}))
    sys.exit(1)

# -------------------------------
# ✅ Entrenamiento y predicción
# -------------------------------
try:
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model_map = {
        "gbr": GradientBoostingRegressor(),
        "rf": RandomForestRegressor(),
        "lr": LinearRegression(),
        "xgb": XGBRegressor()
    }

    model = model_map.get(modelo)
    if model is None:
        print(json.dumps({"error": f"Modelo no soportado: {modelo}"}))
        sys.exit(1)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    future_X = pd.DataFrame([X.mean()] * 3, columns=X.columns)
    y_future = model.predict(future_X)

    mae = mean_absolute_error(y_test, y_pred)
    error_pct = round((mae / y_test.mean()) * 100, 2)

    # ✅ Salida unificada
    output = {
        "debug_info": {
            "filas_validas": len(X),
            "columnas": X.columns.tolist(),
            "ejemplo_primera_fila": X.iloc[0].to_dict() if not X.empty else "N/A"
        },
        "predicciones": y_future.tolist(),
        "error_porcentaje": error_pct
    }

    print(json.dumps(output))

except Exception as e:
    print(json.dumps({"error": f"Error durante el modelado: {str(e)}"}))
    sys.exit(1)
