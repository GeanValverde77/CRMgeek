const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });

const procesarVentas = require('../procesarVentas');

const pronosticoPath = path.join(__dirname, "../pronosticoVentas.json");

const pythonPath = path.join(__dirname, "../pronostico.py"); // Definiendo pythonPath correctamente
const jsonPath = path.join(__dirname, "../pronosticoVentas.json"); // Archivo de salida JSON
// En tu resolvers.js
const GraphQLJSON = require('graphql-type-json');

const crearToken = (usuario, secreta, expiresIn) => {
    // console.log(usuario);
    const { id, email,nombre, apellido } = usuario;

    return jwt.sign( { id, email, nombre, apellido }, secreta, { expiresIn } )
}

const procesarPronosticoPROGPT = require('../graphql/resolversPronosticoPROGPT.js').Mutation.procesarPronosticoPROGPT;


// Resolvers
const resolvers = {
    
    JSON: GraphQLJSON,
    
    Query: {
        obtenerUsuario: async (_, {}, ctx) => {
            return ctx.usuario;
        }, 
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerProducto: async (_, { id }) => {
            // revisar si el producto existe o no
            const producto = await Producto.findById(id);

            if(!producto) {
                throw new Error('Producto no encontrado');
            }

            return producto;
        },


        obtenerModelos: async () => {
        const modelos = await Producto.distinct("nombre");
        return modelos.map(m => m.toUpperCase().trim());
        },

        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerClientesVendedor: async (_, {}, ctx) => {
            console.log("Usuario autenticado:", ctx.usuario); // Log para verificar si el usuario existe
        
            if (!ctx.usuario) {
                throw new Error("No autenticado"); // Si el usuario no está autenticado, lanzar error
            }
        
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                console.log("Clientes encontrados:", clientes); // Log para ver si se están obteniendo clientes
                return clientes;
            } catch (error) {
                console.log("Error al obtener clientes:", error);
                throw new Error("Hubo un error obteniendo los clientes");
            }
        },


        obtenerCliente: async (_, { id }, ctx) => {
            // Revisar si el cliente existe o no
            const cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Cliente no encontrado');
            }

            // Quien lo creo puede verlo
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            return cliente;
        }, 
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerPedidosVendedor: async (_, {}, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id }).populate('cliente');

                // console.log(pedidos);
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        }, 
        obtenerPedido: async(_, {id}, ctx) => {
            // Si el pedido existe o no
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error('Pedido no encontrado');
            }

            // Solo quien lo creo puede verlo
            if(pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales');
            }

            // retornar el resultado
            return pedido;
        }, 
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });

            return pedidos;
        },
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match : { estado : "COMPLETADO" } },
                { $group : {
                    _id : "$cliente", 
                    total: { $sum: '$total' }
                }}, 
                {
                    $lookup: {
                        from: 'clientes', 
                        localField: '_id',
                        foreignField: "_id",
                        as: "cliente"
                    }
                }, 
                {
                    $limit: 10
                }, 
                {
                    $sort : { total : -1 }
                }
            ]);

            return clientes;
        }, 
        mejoresVendedores: async () => {
            const vendedores = await Pedido.aggregate([
                { $match : { estado : "COMPLETADO"} },
                { $group : {
                    _id : "$vendedor", 
                    total: {$sum: '$total'}
                }},
                {
                    $lookup: {
                        from: 'usuarios', 
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                }, 
                {
                    $limit: 3
                }, 
                {
                    $sort: { total : -1 }
                }
            ]);

            return vendedores;
        },
        buscarProducto: async(_, { texto }) => {
            const productos = await Producto.find({ $text: { $search: texto  } }).limit(10)

            return productos;
        },
        pronosticoVentas: async (_, { mes, modelo }) => {
    const scriptVentas = path.join(__dirname, "../procesarVentas.js");
    const scriptModelo = path.join(__dirname, "../pronostico.py");
    const outputPath = path.join(__dirname, "../pronosticoVentas.json");

    console.log("📅 Mes:", mes, "📱 Modelo:", modelo);

    if (!mes || !modelo) {
        throw new Error("❌ Debes proporcionar el mes y el modelo");
    }

    // Paso 1: regenerar ventas.json
    await new Promise((resolve, reject) => {
        execFile("node", [scriptVentas], (err, stdout, stderr) => {
            if (stdout) console.log("📤 ventas.json STDOUT:", stdout.trim());
            if (stderr) console.error("📥 ventas.json STDERR:", stderr.trim());
            if (err) return reject(new Error(`Error al generar ventas.json: ${stderr || err.message}`));
            resolve();
        });
    });

    // Paso 2: ejecutar pronostico.py con mes y modelo
    return new Promise((resolve, reject) => {
        execFile("python", [scriptModelo, mes, modelo], (err, stdout, stderr) => {
            console.log("📤 pronostico.py STDOUT:", stdout.trim());
            if (stderr) console.error("📥 pronostico.py STDERR:", stderr.trim());

            if (err) {
                return reject(new Error(`Error ejecutando pronostico.py: ${stderr || err.message}`));
            }

            try {
                const data = JSON.parse(stdout);
                fs.writeFileSync(outputPath, JSON.stringify(data, null, 2)); // opcional
                resolve(data);
            } catch (parseErr) {
                return reject(new Error(`Error al parsear salida de pronostico.py: ${parseErr.message}`));
            }
        });
    });
},


}, 
    Mutation: {

        nuevoUsuario: async (_, { input } ) => {

            const { email, password } = input;
            
            // Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({email});
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado');
            }

            // Hashear su password
            const salt = await bcryptjs.genSalt(10);
            input.password = await bcryptjs.hash(password, salt);

            try {
                 // Guardarlo en la base de datos
                const usuario = new Usuario(input);
                usuario.save(); // guardarlo
                return usuario;
            } catch (error) {
                console.log(error);
            }
        }, 
        
        autenticarUsuario: async (_, {input}) => {
            const { email, password } = input;
        
            // Si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            if (!existeUsuario) {
                throw new Error('El usuario no existe');
            }
        
            // Mostrar las contraseñas que se están comparando
            console.log("Password ingresado:", password);
            console.log("Password guardado en la BD:", existeUsuario.password);
        
            // Revisar si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            console.log("Resultado de bcrypt.compare():", passwordCorrecto);
        
            if (!passwordCorrecto) {
                console.log("🚨 Error: Las contraseñas no coinciden");
                throw new Error("El Password es Incorrecto");
            }
        
            // **Generar el token**
            const token = crearToken(existeUsuario, process.env.SECRETA, "7d");
        
            // **Confirmar que el token se ha generado**
            console.log("✅ Token generado:", token);
        
            return { token };
        },
        
        nuevoProducto: async (_, {input}) => {
            try {
                const producto = new Producto(input);

                // almacenar en la bd
                const resultado = await producto.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        }, 
        actualizarProducto: async (_, {id, input}) => {
            // revisar si el producto existe o no
            let producto = await Producto.findById(id);

            if(!producto) {
                throw new Error('Producto no encontrado');
            }

            // guardarlo en la base de datos
            producto = await Producto.findOneAndUpdate({ _id : id }, input, { new: true } );

            return producto;
        }, 
        eliminarProducto: async(_, {id}) => {
            // revisar si el producto existe o no
            let producto = await Producto.findById(id);

            if(!producto) {
                throw new Error('Producto no encontrado');
            }

            // Eliminar
            await Producto.findOneAndDelete({_id :  id});

            return "Producto Eliminado";
        },
        nuevoCliente: async (_, { input }, ctx) => {

            console.log(ctx);

            const { email } = input
            // Verificar si el cliente ya esta registrado
            // console.log(input);

            const cliente = await Cliente.findOne({ email });
            if(cliente) {
                throw new Error('Ese cliente ya esta registrado');
            }

            const nuevoCliente = new Cliente(input);

            // asignar el vendedor
            nuevoCliente.vendedor = ctx.usuario.id;

            // guardarlo en la base de datos

            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarCliente: async (_, {id, input}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Ese cliente no existe');
            }

            // Verificar si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // guardar el cliente
            cliente = await Cliente.findOneAndUpdate({_id : id}, input, {new: true} );
            return cliente;
        },
        eliminarCliente : async (_, {id}, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('Ese cliente no existe');
            }

            // Verificar si el vendedor es quien edita
            if(cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // Eliminar Cliente
            await Cliente.findOneAndDelete({_id : id});
            return "Cliente Eliminado"
        },
        nuevoPedido: async (_, {input}, ctx) => {

            const { cliente } = input
            
            // Verificar si existe o no
            let clienteExiste = await Cliente.findById(cliente);

            if(!clienteExiste) {
                throw new Error('Ese cliente no existe');
            }

            // Verificar si el cliente es del vendedor
            if(clienteExiste.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // Revisar que el stock este disponible
            for await ( const articulo of input.pedido ) {
                const { id } = articulo;

                const producto = await Producto.findById(id);

                if(articulo.cantidad > producto.existencia) {
                    throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                } else {
                    // Restar la cantidad a lo disponible
                    producto.existencia = producto.existencia - articulo.cantidad;

                    await producto.save();
                }
            }

            // Crear un nuevo pedido
            const nuevoPedido = new Pedido(input);

            // asignarle un vendedor
            nuevoPedido.vendedor = ctx.usuario.id;

        
            // Guardarlo en la base de datos
            const resultado = await nuevoPedido.save();
            return resultado;

            
        },
        actualizarPedido: async(_, {id, input}, ctx) => {

            const { cliente } = input;

            // Si el pedido existe
            const existePedido = await Pedido.findById(id);
            if(!existePedido) {
                throw new Error('El pedido no existe');
            }

            // Si el cliente existe
            const existeCliente = await Cliente.findById(cliente);
            if(!existeCliente) {
                throw new Error('El Cliente no existe');
            }

            // Si el cliente y pedido pertenece al vendedor
            if(existeCliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales');
            }

            // Revisar el stock
            if( input.pedido ) {
                for await ( const articulo of input.pedido ) {
                    const { id } = articulo;
    
                    const producto = await Producto.findById(id);
    
                    if(articulo.cantidad > producto.existencia) {
                        throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                    } else {
                        // Restar la cantidad a lo disponible
                        producto.existencia = producto.existencia - articulo.cantidad;
    
                        await producto.save();
                    }
                }
            }



            // Guardar el pedido
            const resultado = await Pedido.findOneAndUpdate({_id: id}, input, { new: true });
            return resultado;

        },
        eliminarPedido: async (_, {id}, ctx) => {
            // Verificar si el pedido existe o no
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error('El pedido no existe')
            }

            // verificar si el vendedor es quien lo borra
            if(pedido.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error('No tienes las credenciales')
            }

            // eliminar de la base de datos
            await Pedido.findOneAndDelete({_id: id});
            return "Pedido Eliminado"
        },
        generarPronostico: async (_, { modelo, mes, cliente }) => {
            console.log("📅 Mes:", mes, "📱 Modelo:", modelo, "👤 Cliente:", cliente || "(sin filtro)");

            if (!mes || !modelo) {
                throw new Error("❌ Debes proporcionar el mes y el modelo");
            }

            const scriptParser = path.join(__dirname, "../parse.py");
            const scriptPronostico = path.join(__dirname, "../pronostico.py");
            const outputPath = path.join(__dirname, "../pronosticoVentas.json");

            // Paso 1: ejecutar el parser para generar ventas_parseadas.json
            await new Promise((resolve, reject) => {
                execFile("python", [scriptParser], (err, stdout, stderr) => {
                    if (stdout) console.log("📤 parse.py STDOUT:", stdout.trim());
                    if (stderr) console.error("📥 parse.py STDERR:", stderr.trim());
                    if (err) return reject(new Error(`Error ejecutando parse.py: ${stderr || err.message}`));
                    resolve();
        });
    });

    // Paso 2: ejecutar pronostico.py con mes, modelo y cliente (si se proporcionó)
    return new Promise((resolve, reject) => {
        const args = cliente ? [modelo, mes, cliente] : [modelo, mes];

        execFile("python", [scriptPronostico, ...args], (err, stdout, stderr) => {
            if (stdout) console.log("📤 pronostico.py STDOUT:", stdout.trim());
            if (stderr) console.error("📥 pronostico.py STDERR:", stderr.trim());

            if (err) {
                return reject(new Error(`Error ejecutando pronostico.py: ${stderr || err.message}`));
            }

            try {
                const data = JSON.parse(stdout);
                fs.writeFileSync(outputPath, JSON.stringify(data, null, 2)); // opcional
                resolve(data);
            } catch (parseErr) {
                return reject(new Error(`Error al parsear salida de pronostico.py: ${parseErr.message}`));
            }
        });
        
    });
},
        procesarPronosticoPRO: async (_, { data, target, features, modelo, cliente, producto }) => {
            try {
                const tempPath = path.join(__dirname, "../temp_data.json");
                const scriptPath = path.join(__dirname, "../pronostico_pro.py");

                // Guardar archivo temporal con todos los datos
                fs.writeFileSync(tempPath, JSON.stringify({ data, target, features, modelo, cliente, producto }));

                return new Promise((resolve, reject) => {
                execFile("python", [scriptPath, tempPath], (err, stdout, stderr) => {
                    if (stderr) console.error("📥 STDERR (Python):", stderr);
                    if (stdout) console.log("📤 STDOUT (Python):", stdout);

                    if (err) {
                    return reject(new Error("Error al ejecutar el script Python."));
                    }

                    try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                    } catch (e) {
                    reject(new Error("Error al interpretar la salida del script."));
                    }
                });
                });
            } catch (error) {
                console.error(" Error general en backend:", error.message);
                throw new Error("Error en el backend: " + error.message);
            }
        },

        procesarPronosticoPROGPT: procesarPronosticoPROGPT,
        
    },
    
    

};

module.exports = resolvers;