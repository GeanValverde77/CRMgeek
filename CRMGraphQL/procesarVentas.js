const mongoose = require('mongoose');
const fs = require('fs');
const moment = require('moment');
require('dotenv').config({ path: 'variables.env' });

const Pedido = require('./models/Pedido');

// Conectar a MongoDB
mongoose.connect(process.env.DB_MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("📡 Conectado a MongoDB"))
  .catch(err => console.log("❌ Error al conectar a MongoDB:", err));

async function procesarVentas() {
    try {
        const pedidos = await Pedido.find({ estado: 'COMPLETADO' }).lean();
        console.log("📦 Pedidos COMPLETADOS encontrados:", pedidos.length);

        const ventas = [];

        for (const pedido of pedidos) {
            const fechaSemana = moment(pedido.creado).startOf('isoWeek').toDate(); // lunes de esa semana

            // 👉 Log para detectar si el pedido no tiene productos
            if (!pedido.pedido || pedido.pedido.length === 0) {
                console.warn("⚠️ Pedido sin productos:", pedido._id);
            }

            for (const producto of pedido.pedido) {
                // 👉 Log para ver el contenido de cada producto
                console.log("🛒 Producto:", producto?.nombre, "| Cantidad:", producto?.cantidad);

                if (!producto || !producto.nombre || !producto.cantidad) continue;

                ventas.push({
                    Modelo: producto.nombre.toUpperCase().trim(),
                    "Cantidad vendida": producto.cantidad,
                    Semana: fechaSemana
                });
            }
        }

        fs.writeFileSync('ventas.json', JSON.stringify(ventas, null, 2));
        console.log(`✅ Archivo ventas.json generado con ${ventas.length} registros`);
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error al procesar ventas:", error);
        mongoose.connection.close();
    }
}

module.exports = procesarVentas;

