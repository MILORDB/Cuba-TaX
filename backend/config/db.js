const { Sequelize } = require('sequelize');
require('dotenv').config();

// Creamos la instancia de conexión
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
      }
    );

// Función para probar la conexión
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL exitosa.');
    } catch (error) {
        console.error('❌ No se pudo conectar a PostgreSQL:', error);
    }
};

// 🔑 Exportamos AMBAS cosas
module.exports = { sequelize, testConnection };
