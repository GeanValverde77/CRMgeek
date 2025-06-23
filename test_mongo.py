from pymongo import MongoClient

try:
    client = MongoClient("mongodb+srv://geanmarco770:6QJWSQsj72427ooi@cluster1.s9kr7.mongodb.net/CRMgeek")
    db = client["CRMgeek"]
    colecciones = db.list_collection_names()
    print("✅ Conexión exitosa a MongoDB.")
    print("📁 Colecciones disponibles:", colecciones)

    completados = db["pedidos"].count_documents({"estado": "COMPLETADO"})
    print(f"📦 Pedidos COMPLETADOS encontrados: {completados}")

except Exception as e:
    print("❌ Error al conectar a MongoDB:", e)
