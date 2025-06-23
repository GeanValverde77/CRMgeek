const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const conectarDB = require('./config/db'); 

// Importar modelos
const Pedido = require('./models/Pedido');
const Cliente = require('./models/Cliente');
const Usuario = require('./models/Usuario');

dotenv.config({ path: 'variables.env' });

conectarDB(); // 🔹 Ejecutar la conexión antes de consultar la BD

const exportarVentas = async () => {
    try {
        console.log("⏳ Exportando ventas...");

        const ventas = await Pedido.find({})
            .populate({ path: 'cliente', select: 'nombre apellido email' })
            .populate({ path: 'vendedor', select: 'nombre apellido email' });

        if (ventas.length === 0) {
            console.log('⚠ No hay ventas registradas.');
            mongoose.connection.close();
            return;
        }

        const cabecera = 'ID,Cliente,Vendedor,Total,Estado,Fecha\n';
        const filas = ventas.map(v =>
            `${v._id},"${v.cliente?.nombre || 'Desconocido'} ${v.cliente?.apellido || ''}","${v.vendedor?.nombre || 'Desconocido'} ${v.vendedor?.apellido || ''}",${v.total},${v.estado},${v.fecha}`
        ).join('\n');

        fs.writeFileSync('ventas.csv', cabecera + filas);
        console.log('✅ Archivo ventas.csv exportado correctamente.');

        fs.writeFileSync('ventas.json', JSON.stringify(ventas, null, 2));
        console.log('✅ Archivo ventas.json exportado correctamente.');

        mongoose.connection.close();
        console.log('🔌 Conexión cerrada.');
    } catch (error) {
        console.error('❌ Error al exportar ventas:', error);
        mongoose.connection.close();
    }
};

exportarVentas();
