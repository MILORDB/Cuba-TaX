const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Trip = sequelize.define('Trip', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    pasajero_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'id' },
    },
    conductor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: User, key: 'id' },
    },
    origen: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    destino: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    origen_provincia: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    origen_municipio: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    // 📍 Ubicación GPS del pasajero (origen)
    latitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    longitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    // 🎯 Ubicación del destino
    destino_latitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    destino_longitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    // 🚗 Última ubicación conocida del conductor
    conductor_latitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    conductor_longitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
    },
    conductor_ultima_actualizacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // 📏 Distancia calculada de la ruta
    distancia_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    // 💰 Tarifa por km del conductor al momento de la reserva
    tarifa_por_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    fecha_hora: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'en_curso', 'finalizado', 'cancelado'),
        defaultValue: 'pendiente',
    },
    tarifa_estimada: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    tarifa_final: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
}, {
    timestamps: true,
});

Trip.belongsTo(User, { as: 'pasajero', foreignKey: 'pasajero_id' });
Trip.belongsTo(User, { as: 'conductor', foreignKey: 'conductor_id' });

module.exports = Trip;