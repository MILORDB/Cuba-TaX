const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const PatrolReport = sequelize.define('PatrolReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    conductor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'id' },
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    longitud: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
    },
    comentario: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    // 🔑 Campos para filtrar por ubicación
    provincia: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    municipio: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    timestamps: true,
});

PatrolReport.belongsTo(User, { as: 'conductor', foreignKey: 'conductor_id' });

module.exports = PatrolReport;