const SubscriptionRequest = require('../models/SubscriptionRequest');
const User = require('../models/User');
const { sequelize } = require('../config/db');

const DIAS_DURACION = 32;

// ============================================================
// CONDUCTOR: ENVIAR CÓDIGO (crear solicitud)
// ============================================================
const createRequest = async (req, res) => {
    try {
        const conductor_id = req.user.id;
        const { codigo_conductor } = req.body;

        if (!codigo_conductor || codigo_conductor.trim() === '') {
            return res.status(400).json({ message: 'Debes ingresar tu código.' });
        }

        const user = await User.findByPk(conductor_id);
        if (!user || user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo los conductores pueden solicitar suscripciones.' });
        }

        const pendiente = await SubscriptionRequest.findOne({
            where: {
                conductor_id,
                estado: 'pendiente',
            }
        });

        if (pendiente) {
            return res.status(400).json({
                message: 'Ya tienes una solicitud pendiente. Espera a que el admin la apruebe.'
            });
        }

        const codigoNormalizado = codigo_conductor.trim().toUpperCase();

        const solicitud = await SubscriptionRequest.create({
            conductor_id,
            codigo_conductor: codigoNormalizado,
            estado: 'pendiente',
        });

        res.status(201).json({
            message: 'Solicitud enviada. El administrador debe validar el pago para activar tu suscripción.',
            solicitud,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al enviar código', error: error.message });
    }
};

// ============================================================
// CONDUCTOR: VER SU SOLICITUD ACTUAL Y SUSCRIPCIÓN
// ============================================================
const getMyRequest = async (req, res) => {
    try {
        const conductor_id = req.user.id;

        const solicitud = await SubscriptionRequest.findOne({
            where: { conductor_id },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'nombre_completo'],
                }
            ],
        });

        let suscripcion = { activa: false, expira: null, diasRestantes: 0 };

        try {
            const [result] = await sequelize.query(
                'SELECT subscription_expires_at FROM "Users" WHERE id = :id',
                {
                    replacements: { id: conductor_id },
                    type: sequelize.QueryTypes.SELECT,
                }
            );

            const expiresAt = result?.subscription_expires_at;

            if (expiresAt) {
                const ahora = new Date();
                const expira = new Date(expiresAt);
                const activa = expira > ahora;
                const diasRestantes = activa
                    ? Math.ceil((expira - ahora) / (1000 * 60 * 60 * 24))
                    : 0;

                suscripcion = {
                    activa: activa ? true : false,
                    expira: expira,
                    diasRestantes,
                };
            }
        } catch (dbError) {
            console.warn('⚠️ Error al leer subscription_expires_at:', dbError.message);
        }

        res.json({
            suscripcion,
            solicitud: solicitud || null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener solicitud', error: error.message });
    }
};

// ============================================================
// ADMIN: LISTAR TODAS LAS SOLICITUDES
// ============================================================
const listRequests = async (req, res) => {
    try {
        const { estado } = req.query;

        const where = {};
        if (estado && ['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
            where.estado = estado;
        }

        const solicitudes = await SubscriptionRequest.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'conductor',
                    attributes: ['id', 'nombre_completo', 'email', 'telefono', 'provincia', 'municipio'],
                },
                {
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'nombre_completo'],
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(solicitudes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al listar solicitudes', error: error.message });
    }
};

// ============================================================
// ADMIN: APROBAR SOLICITUD (SQL RAW con RETURNING)
// ============================================================
const approveRequest = async (req, res) => {
    try {
        const admin_id = req.user.id;
        const requestId = req.params.id;
        const { codigo_admin, notas } = req.body;

        console.log('========================================');
        console.log('🔍 [approveRequest] INICIO');
        console.log('   requestId:', requestId);
        console.log('   admin_id:', admin_id);
        console.log('   codigo_admin:', codigo_admin);

        if (!codigo_admin || codigo_admin.trim() === '') {
            return res.status(400).json({ message: 'Debes ingresar el código.' });
        }

        const solicitud = await SubscriptionRequest.findByPk(requestId);
        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        console.log('   Estado solicitud:', solicitud.estado);
        console.log('   Código conductor:', solicitud.codigo_conductor);
        console.log('   Conductor ID:', solicitud.conductor_id);

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ message: `Esta solicitud ya está ${solicitud.estado}.` });
        }

        const codigoNormalizado = codigo_admin.trim().toUpperCase();

        if (solicitud.codigo_conductor !== codigoNormalizado) {
            console.log('   ❌ Códigos NO coinciden');
            return res.status(400).json({
                message: 'El código ingresado NO coincide con el del conductor. Verifica el pago.'
            });
        }

        console.log('   ✅ Códigos coinciden');

        // 🔑 UPDATE con SQL RAW + RETURNING
        const resultado = await sequelize.query(
            `UPDATE "Users" 
             SET "subscription_expires_at" = NOW() + INTERVAL '32 days',
                 "updatedAt" = NOW()
             WHERE id = :id
             RETURNING id, nombre_completo, subscription_expires_at`,
            {
                replacements: { id: solicitud.conductor_id },
                type: sequelize.QueryTypes.UPDATE,
            }
        );

        console.log('   ✅ UPDATE resultado:', JSON.stringify(resultado, null, 2));

        // Verificación adicional con SELECT
        const [verificacion] = await sequelize.query(
            'SELECT id, nombre_completo, subscription_expires_at FROM "Users" WHERE id = :id',
            {
                replacements: { id: solicitud.conductor_id },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        console.log('   ✅ Verificación:', verificacion);

        if (!verificacion || !verificacion.subscription_expires_at) {
            console.log('   ❌ ERROR: la fecha sigue siendo null después del UPDATE');
            return res.status(500).json({
                message: 'Error: la fecha no se guardó en la base de datos. Revisa los logs.'
            });
        }

        // Marcar solicitud como aprobada
        solicitud.codigo_admin = codigoNormalizado;
        solicitud.estado = 'aprobada';
        solicitud.aprobado_por = admin_id;
        solicitud.aprobado_en = new Date();
        solicitud.notas = notas || null;
        await solicitud.save();

        console.log('   ✅ Solicitud marcada como aprobada');
        console.log('========================================');

        const expira = new Date(verificacion.subscription_expires_at).toLocaleDateString('es-CU');

        res.json({
            message: `Suscripción aprobada. El conductor ${verificacion.nombre_completo} tiene acceso hasta el ${expira}.`,
            solicitud,
            conductor: verificacion,
        });
    } catch (error) {
        console.error('❌ [approveRequest] ERROR:', error);
        res.status(500).json({ message: 'Error al aprobar solicitud', error: error.message });
    }
};

// ============================================================
// ADMIN: RECHAZAR SOLICITUD
// ============================================================
const rejectRequest = async (req, res) => {
    try {
        const admin_id = req.user.id;
        const requestId = req.params.id;
        const { motivo } = req.body;

        const solicitud = await SubscriptionRequest.findByPk(requestId);
        if (!solicitud) {
            return res.status(404).json({ message: 'Solicitud no encontrada.' });
        }

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ message: `Esta solicitud ya está ${solicitud.estado}.` });
        }

        solicitud.estado = 'rechazada';
        solicitud.aprobado_por = admin_id;
        solicitud.aprobado_en = new Date();
        solicitud.notas = motivo || 'Sin motivo especificado';
        await solicitud.save();

        res.json({
            message: 'Solicitud rechazada.',
            solicitud,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al rechazar solicitud', error: error.message });
    }
};

// ============================================================
// VERIFICAR SUSCRIPCIÓN PROPIA
// ============================================================
const checkSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await sequelize.query(
            'SELECT subscription_expires_at FROM "Users" WHERE id = :id',
            {
                replacements: { id: userId },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        if (!result) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const expiresAt = result.subscription_expires_at;
        if (!expiresAt) {
            return res.json({ activa: false, expira: null, diasRestantes: 0 });
        }

        const ahora = new Date();
        const expira = new Date(expiresAt);
        const activa = expira > ahora;
        const diasRestantes = activa
            ? Math.ceil((expira - ahora) / (1000 * 60 * 60 * 24))
            : 0;

        res.json({
            activa: activa ? true : false,
            expira,
            diasRestantes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al verificar suscripción', error: error.message });
    }
};

module.exports = {
    createRequest,
    getMyRequest,
    listRequests,
    approveRequest,
    rejectRequest,
    checkSubscription,
    DIAS_DURACION,
};