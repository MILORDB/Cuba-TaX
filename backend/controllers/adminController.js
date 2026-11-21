const User = require('../models/User');
const Trip = require('../models/Trip');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const PatrolReport = require('../models/PatrolReport');
const { Op } = require('sequelize');

// ============================================================
// LISTAR TODOS LOS CONDUCTORES
// ============================================================
const getDrivers = async (req, res) => {
    try {
        const drivers = await User.findAll({
            where: { tipo_usuario: 'conductor' },
            attributes: { exclude: ['password'] },
            order: [['nombre_completo', 'ASC']]
        });
        res.json(drivers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener conductores', error: error.message });
    }
};

// ============================================================
// LISTAR TODOS LOS USUARIOS
// ============================================================
const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

// ============================================================
// VEHÍCULOS ACTIVOS EN TIEMPO REAL
// ============================================================
const getActiveVehicles = async (req, res) => {
    try {
        const trips = await Trip.findAll({
            where: { estado: 'en_curso' },
            include: [
                {
                    model: User,
                    as: 'conductor',
                    attributes: ['id', 'nombre_completo', 'telefono', 'tipo_vehiculo', 'cantidad_pasajeros', 'climatizado', 'tarifa_por_km']
                },
                {
                    model: User,
                    as: 'pasajero',
                    attributes: ['id', 'nombre_completo', 'telefono']
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        const activos = trips.map(t => ({
            trip_id: t.id,
            origen: t.origen,
            destino: t.destino,
            origen_provincia: t.origen_provincia,
            origen_municipio: t.origen_municipio,
            estado: t.estado,
            distancia_km: t.distancia_km,
            tarifa_estimada: t.tarifa_estimada,
            latitud_origen: t.latitud,
            longitud_origen: t.longitud,
            latitud_destino: t.destino_latitud,
            longitud_destino: t.destino_longitud,
            conductor_latitud: t.conductor_latitud,
            conductor_longitud: t.conductor_longitud,
            conductor_ultima_actualizacion: t.conductor_ultima_actualizacion,
            conductor: t.conductor,
            pasajero: t.pasajero,
        }));

        res.json({ total: activos.length, vehiculos: activos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener vehículos activos', error: error.message });
    }
};

// ============================================================
// ESTADÍSTICAS GENERALES
// ============================================================
const getStats = async (req, res) => {
    try {
        const totalUsuarios = await User.count();
        const totalConductores = await User.count({ where: { tipo_usuario: 'conductor' } });
        const totalPasajeros = await User.count({ where: { tipo_usuario: 'pasajero' } });
        const totalViajes = await Trip.count();
        const viajesEnCurso = await Trip.count({ where: { estado: 'en_curso' } });
        const viajesFinalizados = await Trip.count({ where: { estado: 'finalizado' } });
        const viajesPendientes = await Trip.count({ where: { estado: 'pendiente' } });
        const viajesCancelados = await Trip.count({ where: { estado: 'cancelado' } });
        const usuariosBloqueados = await User.count({ where: { bloqueado: true } });

        res.json({
            usuarios: {
                total: totalUsuarios,
                conductores: totalConductores,
                pasajeros: totalPasajeros,
                bloqueados: usuariosBloqueados,
            },
            viajes: {
                total: totalViajes,
                en_curso: viajesEnCurso,
                finalizados: viajesFinalizados,
                pendientes: viajesPendientes,
                cancelados: viajesCancelados,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
};

// ============================================================
// OBTENER INFORMACIÓN DE PAGO
// ============================================================
const getPaymentInfo = async (req, res) => {
    try {
        const admin = await User.findOne({
            where: {
                tipo_usuario: 'admin',
                numero_tarjeta: { [Op.ne]: null }
            },
            attributes: ['id', 'nombre_completo', 'numero_tarjeta'],
        });

        if (!admin || !admin.numero_tarjeta) {
            return res.json({
                numero_tarjeta: null,
                mensaje: 'El administrador aún no ha configurado un número de tarjeta.'
            });
        }

        res.json({
            numero_tarjeta: admin.numero_tarjeta,
            nombre_admin: admin.nombre_completo,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener información de pago', error: error.message });
    }
};

// ============================================================
// ACTUALIZAR INFORMACIÓN DE PAGO
// ============================================================
const updatePaymentInfo = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { numero_tarjeta } = req.body;

        if (!numero_tarjeta || numero_tarjeta.trim() === '') {
            return res.status(400).json({ message: 'Debes ingresar un número de tarjeta.' });
        }

        const admin = await User.findByPk(adminId);
        if (!admin) {
            return res.status(404).json({ message: 'Administrador no encontrado.' });
        }

        if (admin.tipo_usuario !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden configurar esto.' });
        }

        admin.numero_tarjeta = numero_tarjeta.trim();
        await admin.save();

        res.json({
            message: 'Número de tarjeta actualizado correctamente.',
            numero_tarjeta: admin.numero_tarjeta,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar información de pago', error: error.message });
    }
};

// ============================================================
// BLOQUEAR / DESBLOQUEAR CUENTA
// ============================================================
const toggleBlockUser = async (req, res) => {
    try {
        const adminId = req.user.id;
        const userId = req.params.id;

        const admin = await User.findByPk(adminId);
        if (!admin || admin.tipo_usuario !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden bloquear cuentas.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (user.tipo_usuario === 'admin') {
            return res.status(400).json({ message: 'No puedes bloquear a un administrador.' });
        }

        if (Number(user.id) === Number(adminId)) {
            return res.status(400).json({ message: 'No puedes bloquearte a ti mismo.' });
        }

        user.bloqueado = !user.bloqueado;
        await user.save();

        res.json({
            message: user.bloqueado
                ? `La cuenta de ${user.nombre_completo} ha sido BLOQUEADA.`
                : `La cuenta de ${user.nombre_completo} ha sido DESBLOQUEADA.`,
            user: {
                id: user.id,
                nombre_completo: user.nombre_completo,
                email: user.email,
                bloqueado: user.bloqueado,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al bloquear/desbloquear usuario', error: error.message });
    }
};

// ============================================================
// ELIMINAR CUENTA (con borrado en cascada manual)
// ============================================================
const deleteUser = async (req, res) => {
    try {
        const adminId = req.user.id;
        const userId = req.params.id;

        const admin = await User.findByPk(adminId);
        if (!admin || admin.tipo_usuario !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores pueden eliminar cuentas.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (user.tipo_usuario === 'admin') {
            return res.status(400).json({ message: 'No puedes eliminar a un administrador.' });
        }

        if (Number(user.id) === Number(adminId)) {
            return res.status(400).json({ message: 'No puedes eliminarte a ti mismo.' });
        }

        const nombreEliminado = user.nombre_completo;

        // 🔑 Borrado en cascada manual
        // 1. Eliminar reportes de patrullas del usuario
        await PatrolReport.destroy({ where: { conductor_id: userId } });

        // 2. Eliminar solicitudes de suscripción del usuario
        await SubscriptionRequest.destroy({ where: { conductor_id: userId } });

        // 3. Cancelar viajes donde el usuario es pasajero o conductor
        await Trip.update(
            { estado: 'cancelado' },
            {
                where: {
                    [Op.or]: [
                        { pasajero_id: userId },
                        { conductor_id: userId }
                    ]
                }
            }
        );

        // 4. Eliminar el usuario
        await user.destroy();

        console.log(`🗑️ Usuario eliminado: ${nombreEliminado} (ID: ${userId}) por admin ${adminId}`);

        res.json({
            message: `La cuenta de ${nombreEliminado} ha sido ELIMINADA permanentemente.`,
            deleted: {
                id: userId,
                nombre_completo: nombreEliminado,
            },
        });
    } catch (error) {
        console.error('❌ Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
};

module.exports = {
    getDrivers,
    getUsers,
    getActiveVehicles,
    getStats,
    getPaymentInfo,
    updatePaymentInfo,
    toggleBlockUser,
    deleteUser,
};