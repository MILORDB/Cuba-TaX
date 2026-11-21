const { Sequelize } = require('sequelize');
require('dotenv').config();

// Usa la URL de conexión completa si está disponible
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        // Render requiere SSL para conexiones externas, pero la interna no.
        // Si usas la URL interna, esto no es necesario. Si usas la externa, sí.
        ssl: process.env.DATABASE_URL.includes('render.com') 
          ? { require: true, rejectUnauthorized: false } 
          : false,
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

module.exports = { sequelize };
