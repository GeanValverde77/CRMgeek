const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar JSON

  # 📌 Tipos base
  type Usuario {
    id: ID
    nombre: String
    apellido: String
    email: String
    creado: String
  }

  type Token {
    token: String
  }

  type Producto {
    id: ID
    nombre: String
    existencia: Int
    precio: Float
    creado: String
  }

  type Cliente {
    id: ID
    nombre: String
    apellido: String
    empresa: String
    email: String
    telefono: String
    vendedor: ID
  }

  type Pedido {
    id: ID
    pedido: [PedidoGrupo]
    total: Float
    cliente: Cliente
    vendedor: ID
    fecha: String
    estado: EstadoPedido
  }

  type PedidoGrupo {
    id: ID
    cantidad: Int
    nombre: String
    precio: Float
  }

  type TopCliente {
    total: Float
    cliente: [Cliente]
  }

  type TopVendedor {
    total: Float
    vendedor: [Usuario]
  }

  # 📌 Pronóstico clásico
  type PronosticoItem {
    semana: String
    prediccion: Float
    real: Float
  }

  type Pronostico {
    totalVentas: Float
    promedio: Float
    errorCuadratico: Float
    pronostico: [PronosticoItem]
  }

  # 📌 Tipos para predicción PRO + GPT
  type HistoricoItem {
    Semana: String
    Total: Float
    SemanaIndex: Int
  }

  type PrediccionItem {
    semana: String
    prediccion: Float
  }

  type PrediccionModelo {
    semana: String
    valor: Float
  }

  type ModeloResultado {
    modelo: String
    MAE: Float
    MAPE: Float
    R2: Float
    precision: String
    recomendacion: String
    predicciones: [PrediccionModelo]
  }

  type ResultadoPronosticoPROGPT {
    modelos: [ModeloResultado]
    historico: [HistoricoItem]
    prediccion: [PrediccionItem]
  }

  type ResultadoPronosticoPRO {
    predicciones: [Float]
    error_porcentaje: Float
  }

  # 📌 Inputs
  input UsuarioInput {
    nombre: String!
    apellido: String!
    email: String!
    password: String!
  }

  input AutenticarInput {
    email: String!
    password: String!
  }

  input ProductoInput {
    nombre: String!
    existencia: Int!
    precio: Float!
  }

  input ClienteInput {
    nombre: String!
    apellido: String!
    empresa: String!
    email: String!
    telefono: String
  }

  input PedidoProductoInput {
    id: ID
    cantidad: Int
    nombre: String
    precio: Float
  }

  input PedidoInput {
    pedido: [PedidoProductoInput]
    total: Float
    cliente: ID
    estado: EstadoPedido
  }

  # 📌 Enums
  enum EstadoPedido {
    PENDIENTE
    COMPLETADO
    CANCELADO
  }

  # 📌 Queries
  type Query {
    obtenerUsuario: Usuario
    obtenerProductos: [Producto]
    obtenerProducto(id: ID!): Producto
    obtenerModelos: [String]
    obtenerClientes: [Cliente]
    obtenerClientesVendedor: [Cliente]
    obtenerCliente(id: ID!): Cliente
    obtenerPedidos: [Pedido]
    obtenerPedidosVendedor: [Pedido]
    obtenerPedido(id: ID!): Pedido
    obtenerPedidosEstado(estado: String!): [Pedido]
    mejoresClientes: [TopCliente]
    mejoresVendedores: [TopVendedor]
    buscarProducto(texto: String!): [Producto]
    pronosticoVentas(mes: String!, modelo: String!, cliente: String): Pronostico
  }

  # 📌 Mutations
  type Mutation {
    nuevoUsuario(input: UsuarioInput): Usuario
    autenticarUsuario(input: AutenticarInput): Token

    nuevoProducto(input: ProductoInput): Producto
    actualizarProducto(id: ID!, input: ProductoInput): Producto
    eliminarProducto(id: ID!): String

    nuevoCliente(input: ClienteInput): Cliente
    actualizarCliente(id: ID!, input: ClienteInput): Cliente
    eliminarCliente(id: ID!): String

    nuevoPedido(input: PedidoInput): Pedido
    actualizarPedido(id: ID!, input: PedidoInput): Pedido
    eliminarPedido(id: ID!): String

    generarPronostico(mes: String!, modelo: String!, cliente: String): Pronostico

    procesarPronosticoPRO(
      data: JSON
      target: String!
      features: [String!]!
      modelo: String!
      cliente: String
      producto: String
    ): ResultadoPronosticoPRO

    procesarPronosticoPROGPT(data: JSON!): ResultadoPronosticoPROGPT
    analizarPronosticoGPT(data: JSON!): String
  }
`;

module.exports = typeDefs;
