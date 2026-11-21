const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado o mal formado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

// Middleware para verificar que el usuario sea admin
const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user || user.tipo_usuario !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al verificar admin.', error: error.message });
    }
};

// Middleware para verificar que el usuario NO esté bloqueado
const verifyNotBlocked = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado.' });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'bloqueado']
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (user.bloqueado) {
            return res.status(403).json({
                message: 'Tu cuenta ha sido bloqueada. Contacta al administrador.'
            });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al verificar bloqueo.', error: error.message });
    }
};

module.exports = { verifyToken, verifyAdmin, verifyNotBlocked };