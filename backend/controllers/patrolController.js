const PatrolReport = require('../models/PatrolReport');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const DURACION_HORAS = 1;

// ============================================================
// CREAR REPORTE DE PATRULLA
// ============================================================
const createPatrolReport = async (req, res) => {
    try {
        const conductor_id = req.user.id;
        const { latitud, longitud, comentario } = req.body;

        if (!latitud || !longitud) {
            return res.status(400).json({ message: 'Se requieren latitud y longitud.' });
        }

        const user = await User.findByPk(conductor_id);
        if (!user || user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo conductores pueden reportar patrullas.' });
        }

        // 🔑 Leer suscripción y ubicación con SQL directo
        const [result] = await sequelize.query(
            'SELECT subscription_expires_at, provincia, municipio FROM "Users" WHERE id = :id',
            {
                replacements: { id: conductor_id },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        const expiresAt = result?.subscription_expires_at;
        const ahora = new Date();
        const activa = expiresAt && new Date(expiresAt) > ahora;

        console.log('🔍 [createPatrolReport] Usuario:', user.nombre_completo);
        console.log('   subscription_expires_at:', expiresAt);
        console.log('   ¿Activa?:', activa);

        if (!activa) {
            return res.status(403).json({
                message: 'Necesitas una suscripción activa para reportar patrullas.'
            });
        }

        const provincia = result?.provincia || user.provincia;
        const municipio = result?.municipio || user.municipio;

        if (!provincia || !municipio) {
            return res.status(400).json({
                message: 'Debes configurar tu provincia y municipio en tu perfil antes de reportar patrullas.'
            });
        }

        const expiraReporte = new Date(Date.now() + DURACION_HORAS * 60 * 60 * 1000);

        const report = await PatrolReport.create({
            conductor_id,
            latitud,
            longitud,
            comentario: comentario || null,
            provincia,
            municipio,
            activo: true,
            expiresAt: expiraReporte,
        });

        res.status(201).json({
            message: `Patrulla reportada. Será visible por ${DURACION_HORAS} hora(s) en ${municipio}, ${provincia}.`,
            report,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al reportar patrulla', error: error.message });
    }
};

// ============================================================
// OBTENER REPORTES ACTIVOS (filtrados por provincia/municipio)
// ============================================================
const getActivePatrols = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user || user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo conductores pueden ver las patrullas.' });
        }

        // 🔑 Leer subscription_expires_at con SQL directo
        const [result] = await sequelize.query(
            'SELECT subscription_expires_at, provincia, municipio FROM "Users" WHERE id = :id',
            {
                replacements: { id: userId },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        const expiresAt = result?.subscription_expires_at;
        const ahora = new Date();
        const expira = expiresAt ? new Date(expiresAt) : null;
        const activa = expira && expira > ahora;

        console.log('🔍 [getActivePatrols] Usuario:', user.nombre_completo);
        console.log('   subscription_expires_at:', expiresAt);
        console.log('   ¿Activa?:', activa);
        console.log('   provincia:', result?.provincia);
        console.log('   municipio:', result?.municipio);

        if (!activa) {
            return res.status(403).json({
                message: 'Necesitas una suscripción activa para ver las patrullas.'
            });
        }

        const provincia = result?.provincia || user.provincia;
        const municipio = result?.municipio || user.municipio;

        if (!provincia || !municipio) {
            return res.status(400).json({
                message: 'Debes configurar tu provincia y municipio en tu perfil.'
            });
        }

        const reports = await PatrolReport.findAll({
            where: {
                activo: true,
                expiresAt: { [Op.gt]: ahora },
                provincia: provincia,
                municipio: municipio,
            },
            include: [
                {
                    model: User,
                    as: 'conductor',
                    attributes: ['id', 'nombre_completo'],
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json({
            total: reports.length,
            zona: `${municipio}, ${provincia}`,
            patrullas: reports,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener patrullas', error: error.message });
    }
};

// ============================================================
// ELIMINAR REPORTE PROPIO
// ============================================================
const deletePatrolReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const conductor_id = req.user.id;

        const report = await PatrolReport.findByPk(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Reporte no encontrado.' });
        }

        if (Number(report.conductor_id) !== Number(conductor_id)) {
            return res.status(403).json({ message: 'Solo puedes eliminar tus propios reportes.' });
        }

        await report.destroy();
        res.json({ message: 'Reporte eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar reporte', error: error.message });
    }
};

module.exports = {
    createPatrolReport,
    getActivePatrols,
    deletePatrolReport,
};