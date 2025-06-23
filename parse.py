from pymongo import MongoClient
import pandas as pd
import json

# Conexión a MongoDB
client = MongoClient("mongodb+srv://geanmarco770:6QJWSQsj72427ooi@cluster1.s9kr7.mongodb.net/CRMgeek")
db = client["CRMgeek"]
colecciones = db["pedidos"]

# Consultar todos los pedidos COMPLETADOS
cursor = colecciones.find({"estado": "COMPLETADO"})

# Convertir pedidos en filas planas
rows = []
for doc in cursor:
    # Convertir y eliminar zona horaria si existe
    fecha_creado = pd.to_datetime(doc["creado"]).tz_localize(None) if pd.to_datetime(doc["creado"]).tzinfo else pd.to_datetime(doc["creado"])
    
    for item in doc.get("pedido", []):
        rows.append({
            "Semana": fecha_creado,
            "Modelo": item["nombre"].upper(),
            "Cantidad vendida": item["cantidad"],
            "Precio": item["precio"]
        })

# Crear DataFrame
df = pd.DataFrame(rows)

# Procesar columnas temporales
df["Semana"] = pd.to_datetime(df["Semana"]).dt.tz_localize(None)  # quitar zona horaria si queda alguna
df["anio"] = df["Semana"].dt.year
df["weeks_since_start"] = (df["Semana"] - df["Semana"].min()).dt.days // 7
df["semana_del_ano"] = df["Semana"].dt.isocalendar().week

# Convertir columna 'Semana' a string para exportación
df["Semana"] = df["Semana"].dt.strftime("%Y-%m-%d")

# Convertir a JSON
json_data = df.to_dict(orient="records")

# Guardar en archivo JSON
with open("ventas_parseadas.json", "w", encoding="utf-8") as f:
    json.dump(json_data, f, indent=2, ensure_ascii=False)

print("Datos exportados con precios a 'ventas_parseadas.json'")
