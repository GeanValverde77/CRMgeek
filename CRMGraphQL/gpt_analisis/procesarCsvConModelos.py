import sys
import pandas as pd
import json
from datetime import timedelta
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
import traceback
import warnings

warnings.filterwarnings("ignore")

if len(sys.argv) != 2:
    print(json.dumps({"error": "Uso: python procesarCsvConModelos.py <archivo.csv>"}))
    sys.exit(1)

input_file = sys.argv[1]

try:
    df = pd.read_csv(input_file, encoding="utf-8", skip_blank_lines=True)

    if "Fecha" not in df.columns or "Cantidad" not in df.columns:
        raise Exception("El CSV debe contener las columnas 'Fecha' y 'Cantidad'.")

    # 🧼 Limpiar columna 'Cantidad'
    df['Cantidad'] = df['Cantidad'].astype(str).str.extract(r'(\d+(?:[\.,]\d+)?)')[0]
    df['Cantidad'] = df['Cantidad'].str.replace(',', '.')
    df['Cantidad'] = pd.to_numeric(df['Cantidad'], errors='coerce')

    # ✅ Procesar fecha
    df['Fecha'] = pd.to_datetime(df['Fecha'], format="%d/%m/%Y %H:%M", errors='coerce')

    df = df.dropna(subset=['Fecha', 'Cantidad'])

    # Agrupar por semana
    df['Semana'] = df['Fecha'].dt.to_period('W').apply(lambda r: r.start_time)
    df_sem = df.groupby('Semana')['Cantidad'].sum().reset_index().sort_values('Semana')

    if len(df_sem) < 5:
        raise Exception("Se requieren al menos 5 semanas de datos para realizar predicciones.")

    df_sem['SemanaIndex'] = range(len(df_sem))
    X = df_sem[['SemanaIndex']]
    y = df_sem['Cantidad']

    X_train, X_test = X[:-4], X[-4:]
    y_train, y_test = y[:-4], y[-4:]

    modelos = {
        "GBR": GradientBoostingRegressor(n_estimators=100, random_state=42),
        "RF": RandomForestRegressor(n_estimators=100, random_state=42),
        "LR": LinearRegression(),
        "XGB": XGBRegressor(verbosity=0)
    }

    modelos_resultado = []
    historico = df_sem.copy()
    historico['Semana'] = historico['Semana'].dt.strftime("%Y-%m-%d")
    historico = historico.to_dict(orient="records")
    prediccion_promedio = []

    semanas_futuras = [df_sem['Semana'].max() + timedelta(weeks=i) for i in range(1, 13)]
    predicciones_por_modelo = {}

    for nombre, modelo in modelos.items():
        modelo.fit(X_train, y_train)
        pred_test = modelo.predict(X_test)

        mae = mean_absolute_error(y_test, pred_test)
        mape = mean_absolute_percentage_error(y_test, pred_test) * 100
        r2 = r2_score(y_test, pred_test)

        ult_index = df_sem['SemanaIndex'].max()
        nuevas_filas = pd.DataFrame({'SemanaIndex': range(ult_index + 1, ult_index + 13)})
        pred_futuras = modelo.predict(nuevas_filas)

        pred_semana = [
            {"semana": fecha.strftime("%Y-%m-%d"), "valor": max(round(float(val), 2), 0)}
            for fecha, val in zip(semanas_futuras, pred_futuras)
        ]



        modelos_resultado.append({
            "modelo": nombre,
            "MAE": round(mae, 2),
            "MAPE": round(mape, 2),
            "R2": round(r2, 2),
            "predicciones": pred_semana
        })

        predicciones_por_modelo[nombre] = pred_futuras

    # Modelo adicional: ADAPTATIVO
    try:
        if len(df_sem) < 6:
            promedio = y_train.mean()
            pred_futuras = [promedio] * 12
            mae = mean_absolute_error(y_test, [promedio]*len(y_test))
            mape = mean_absolute_percentage_error(y_test, [promedio]*len(y_test)) * 100
            r2 = r2_score(y_test, [promedio]*len(y_test))
        elif len(df_sem) < 12:
            modelo_simple = LinearRegression()
            modelo_simple.fit(X_train, y_train)
            pred_test = modelo_simple.predict(X_test)
            mae = mean_absolute_error(y_test, pred_test)
            mape = mean_absolute_percentage_error(y_test, pred_test) * 100
            r2 = r2_score(y_test, pred_test)
            ult_index = df_sem['SemanaIndex'].max()
            nuevas_filas = pd.DataFrame({'SemanaIndex': range(ult_index + 1, ult_index + 13)})
            pred_futuras = modelo_simple.predict(nuevas_filas)
        else:
            pred_futuras = []
            mae = mape = r2 = None

        if pred_futuras is not None and len(pred_futuras) > 0:
            pred_semana = [
                {"semana": fecha.strftime("%Y-%m-%d"), "valor": round(float(val), 2)}
                for fecha, val in zip(semanas_futuras, pred_futuras)
            ]

            modelos_resultado.append({
                "modelo": "ADAPTATIVO",
                "MAE": round(mae, 2),
                "MAPE": round(mape, 2),
                "R2": round(r2, 2),
                "predicciones": pred_semana
            })

            predicciones_por_modelo["ADAPTATIVO"] = [max(round(float(val), 2), 0) for val in pred_futuras]


    except Exception as e:
        print(json.dumps({
            "error": f"Error en modelo adaptativo: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

    # Predicción promedio entre todos los modelos
    for i in range(12):
        promedio = sum(predicciones_por_modelo[m][i] for m in predicciones_por_modelo) / len(predicciones_por_modelo)
        prediccion_promedio.append({
            "semana": semanas_futuras[i].strftime("%Y-%m-%d"),
            "prediccion": max(round(promedio, 2), 0)
        })


    print(json.dumps({
        "modelos": modelos_resultado,
        "historico": historico,
        "prediccion": prediccion_promedio
    }, ensure_ascii=False))

except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
