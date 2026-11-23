const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
// ACTUALIZAR PERFIL DEL USUARIO AUTENTICADO
// ============================================================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nombre_completo, telefono, direccion, provincia, municipio } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        user.nombre_completo = nombre_completo || user.nombre_completo;
        user.telefono = telefono || user.telefono;
        user.direccion = direccion || user.direccion;
        user.provincia = provincia || user.provincia;
        user.municipio = municipio || user.municipio;

        await user.save();

        const { password, ...userData } = user.toJSON();
        res.json({ message: 'Perfil actualizado', user: userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
    }
};

// ============================================================
// OBTENER USUARIO AUTENTICADO (/users/me)
// ============================================================
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
};

// ============================================================
// CONVERTIR USUARIO A CONDUCTOR
// ============================================================
const becomeDriver = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (user.tipo_usuario === 'conductor') {
            return res.status(400).json({ message: 'Ya eres conductor' });
        }

        if (user.tipo_usuario === 'admin') {
            return res.status(400).json({ message: 'Un administrador no puede cambiarse a conductor' });
        }

        // 🔑 Cambiar tipo de usuario
        user.tipo_usuario = 'conductor';
        await user.save();

        // 🔑 Recargar para obtener los datos actualizados
        await user.reload();

        const { password, ...userData } = user.toJSON();

        // 🔑 Generar nuevo token con el tipo actualizado
        const newToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                tipo: user.tipo_usuario,          // ← Ahora es 'conductor'
                nombre_completo: user.nombre_completo
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('🔍 [becomeDriver] Usuario actualizado a conductor:', userData.email);
        console.log('🔍 [becomeDriver] Tipo:', userData.tipo_usuario);
        console.log('🔍 [becomeDriver] Nuevo token generado:', newToken.substring(0, 30) + '...');

        res.json({
            message: '¡Felicidades! Ahora eres conductor en Cuba-TaX',
            user: userData,
            token: newToken
        });
    } catch (error) {
        console.error('❌ [becomeDriver] Error:', error);
        res.status(500).json({ message: 'Error al cambiar a conductor', error: error.message });
    }
};

// ============================================================
// GUARDAR / ACTUALIZAR DATOS DEL VEHÍCULO
// ============================================================
const saveVehicle = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tipo_vehiculo, cantidad_pasajeros, climatizado, tarifa_por_km } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo los conductores pueden registrar un vehículo.' });
        }

        const tiposPermitidos = ['van', 'guagua', 'mini-van', 'auto_ligero', 'moto', 'carro_electrico'];
        if (!tipo_vehiculo || !tiposPermitidos.includes(tipo_vehiculo)) {
            return res.status(400).json({ message: 'Tipo de vehículo inválido.' });
        }
        if (!cantidad_pasajeros || cantidad_pasajeros < 1 || cantidad_pasajeros > 50) {
            return res.status(400).json({ message: 'La cantidad de pasajeros debe estar entre 1 y 50.' });
        }
        if (tarifa_por_km === undefined || tarifa_por_km < 0) {
            return res.status(400).json({ message: 'La tarifa por km debe ser mayor o igual a 0.' });
        }

        user.tipo_vehiculo = tipo_vehiculo;
        user.cantidad_pasajeros = cantidad_pasajeros;
        user.climatizado = !!climatizado;
        user.tarifa_por_km = tarifa_por_km;
        user.vehiculo_registrado = true;

        await user.save();

        const { password, ...userData } = user.toJSON();
        res.json({
            message: 'Vehículo guardado correctamente',
            user: userData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar vehículo', error: error.message });
    }
};

// ============================================================
// OBTENER DATOS DEL VEHÍCULO
// ============================================================
const getVehicle = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: [
                'id',
                'tipo_vehiculo',
                'cantidad_pasajeros',
                'climatizado',
                'tarifa_por_km',
                'vehiculo_registrado',
                'disponible'
            ]
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener vehículo', error: error.message });
    }
};

// ============================================================
// CAMBIAR DISPONIBILIDAD DEL CONDUCTOR
// ============================================================
const toggleAvailability = async (req, res) => {
    try {
        const userId = req.user.id;
        const { disponible } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo los conductores pueden cambiar su disponibilidad.' });
        }

        if (!user.vehiculo_registrado) {
            return res.status(400).json({
                message: 'Debes registrar tu vehículo antes de ponerte disponible.'
            });
        }

        user.disponible = (typeof disponible === 'boolean') ? disponible : !user.disponible;
        await user.save();

        const { password, ...userData } = user.toJSON();
        res.json({
            message: user.disponible
                ? '¡Estás disponible para trabajar!'
                : 'Estás fuera de servicio.',
            user: userData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cambiar disponibilidad', error: error.message });
    }
};

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password_actual, password_nueva } = req.body;

        if (!password_actual || !password_nueva) {
            return res.status(400).json({ message: 'Debes proporcionar la contraseña actual y la nueva.' });
        }

        if (password_nueva.length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const esValida = await bcrypt.compare(password_actual, user.password);
        if (!esValida) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password_nueva, salt);
        await user.save();

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
    }
};

module.exports = {
    updateProfile,
    getMe,
    becomeDriver,
    saveVehicle,
    getVehicle,
    toggleAvailability,
    changePassword
};
