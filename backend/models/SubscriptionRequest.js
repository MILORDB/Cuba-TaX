const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const SubscriptionRequest = sequelize.define('SubscriptionRequest', {
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
    codigo_conductor: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    codigo_admin: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
        allowNull: false,
        defaultValue: 'pendiente',
    },
    aprobado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: User, key: 'id' },
    },
    aprobado_en: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    notas: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    timestamps: true,
});

SubscriptionRequest.belongsTo(User, { as: 'conductor', foreignKey: 'conductor_id' });
SubscriptionRequest.belongsTo(User, { as: 'admin', foreignKey: 'aprobado_por' });

module.exports = SubscriptionRequest;