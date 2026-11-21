const { Sequelize } = require('sequelize');
require('dotenv').config();

// Creamos la instancia de conexión
const sequelize = new Sequelize(
    process.env.DB_NAME,       // Nombre de la BD
    process.env.DB_USER,       // Usuario
    process.env.DB_PASSWORD,   // Contraseña
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',   // Tipo de base de datos
        logging: false,        // Para que no llene la consola de SQL
        // 🔑 Forzar el esquema public y evitar problemas de search_path
        define: {
            schema: 'public',
            timestamps: true,
        },
        dialectOptions: {
            // Forzar búsqueda en public
            options: '-c search_path=public',
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

// Función para probar la conexión
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL exitosa.');

        // Verificar esquema actual
        const [result] = await sequelize.query('SELECT current_database(), current_schema();');
        console.log('📊 Base de datos:', result[0].current_database);
        console.log('📊 Esquema actual:', result[0].current_schema);
    } catch (error) {
        console.error('❌ No se pudo conectar a PostgreSQL:', error);
    }
};

// Exportamos la conexión para usarla en otros archivos
module.exports = { sequelize, testConnection };