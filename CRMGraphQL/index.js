const { ApolloServer, gql } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');
require('dotenv').config({ path: 'variables.env' });
const jwt = require('jsonwebtoken');

// Conectar DB
conectarDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers['authorization'] || '';
    if (token) {
      try {
        const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA);
        return { usuario };
      } catch (error) {
        console.log('Token inválido');
      }
    }
  }
});

// Iniciar servidor
server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀 Servidor listo en ${url}`);
});
