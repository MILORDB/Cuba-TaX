const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre_completo: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    ci: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    direccion: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    provincia: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    municipio: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    tipo_usuario: {
        type: DataTypes.ENUM('pasajero', 'conductor', 'admin'),
        defaultValue: 'pasajero',
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    foto_perfil: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    // ===== DATOS DEL VEHÍCULO =====
    tipo_vehiculo: {
        type: DataTypes.ENUM('van', 'guagua', 'mini-van', 'auto_ligero', 'moto', 'carro_electrico'),
        allowNull: true,
    },
    cantidad_pasajeros: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 50 },
    },
    climatizado: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    tarifa_por_km: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: { min: 0 },
    },
    vehiculo_registrado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    // ===== DISPONIBILIDAD DEL CONDUCTOR =====
    disponible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    // ===== SUSCRIPCIÓN =====
    subscription_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // ===== CONFIGURACIÓN DEL ADMIN =====
    numero_tarjeta: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = User;