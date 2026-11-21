const jwt = require('jsonwebtoken');

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    // 1. Obtener el token del header "Authorization"
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }

    // 2. El token viene como "Bearer <token>" -> separamos
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Formato de token inválido.' });
    }

    // 3. Verificar el token con la clave secreta
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardamos los datos del usuario en la petición
        next(); // Pasamos al siguiente middleware o controlador
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};

// Middleware opcional para verificar si es conductor
const verifyConductor = (req, res, next) => {
    if (req.user.tipo !== 'conductor' && req.user.tipo !== 'admin') {
        return res.status(403).json({ message: 'Acceso solo para conductores.' });
    }
    next();
};

// Middleware opcional para verificar si es pasajero
const verifyPasajero = (req, res, next) => {
    if (req.user.tipo !== 'pasajero' && req.user.tipo !== 'admin') {
        return res.status(403).json({ message: 'Acceso solo para pasajeros.' });
    }
    next();
};

module.exports = { verifyToken, verifyConductor, verifyPasajero };