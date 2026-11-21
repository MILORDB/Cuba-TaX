const Trip = require('../models/Trip');
const User = require('../models/User');
const { Op } = require('sequelize');

// ============================================================
// 1. Solicitar viaje (pasajero)
// ============================================================
const createTrip = async (req, res) => {
    try {
        const pasajero_id = req.user.id;
        const {
            origen,
            destino,
            conductor_id,
            latitud,
            longitud,
            destino_latitud,
            destino_longitud,
            distancia_km,
        } = req.body;

        const user = await User.findByPk(pasajero_id);
        if (user.tipo_usuario !== 'pasajero') {
            return res.status(403).json({ message: 'Solo los pasajeros pueden solicitar viajes.' });
        }

        if (!user.provincia || !user.municipio) {
            return res.status(400).json({
                message: 'Debes tener provincia y municipio configurados en tu perfil antes de pedir un taxi.'
            });
        }

        let conductorAsignado = null;
        let tarifaReal = null;
        let distanciaFinal = distancia_km ? parseFloat(distancia_km) : null;
        let tarifaPorKmConductor = null;

        if (conductor_id) {
            const conductor = await User.findByPk(conductor_id);

            if (!conductor || conductor.tipo_usuario !== 'conductor') {
                return res.status(404).json({ message: 'Conductor no encontrado.' });
            }
            if (conductor.provincia !== user.provincia || conductor.municipio !== user.municipio) {
                return res.status(400).json({ message: 'El conductor no pertenece a tu zona.' });
            }
            if (!conductor.vehiculo_registrado) {
                return res.status(400).json({ message: 'El conductor no tiene vehículo registrado.' });
            }
            if (!conductor.disponible) {
                return res.status(400).json({ message: 'El conductor no está disponible en este momento.' });
            }

            const viajeActivo = await Trip.findOne({
                where: {
                    conductor_id: conductor.id,
                    estado: 'en_curso'
                }
            });
            if (viajeActivo) {
                return res.status(400).json({
                    message: 'El conductor seleccionado ya tiene un viaje en curso. Elige otro vehículo.'
                });
            }

            conductorAsignado = conductor_id;
            tarifaPorKmConductor = parseFloat(conductor.tarifa_por_km) || 0;

            if (distanciaFinal && tarifaPorKmConductor > 0) {
                tarifaReal = distanciaFinal * tarifaPorKmConductor;
            } else if (tarifaPorKmConductor > 0) {
                distanciaFinal = Math.floor(Math.random() * 20) + 5;
                tarifaReal = distanciaFinal * tarifaPorKmConductor;
            }
        }

        const newTrip = await Trip.create({
            pasajero_id,
            conductor_id: conductorAsignado,
            origen,
            destino,
            origen_provincia: user.provincia,
            origen_municipio: user.municipio,
            latitud: latitud || null,
            longitud: longitud || null,
            destino_latitud: destino_latitud || null,
            destino_longitud: destino_longitud || null,
            distancia_km: distanciaFinal,
            tarifa_por_km: tarifaPorKmConductor,
            tarifa_estimada: tarifaReal,
            estado: 'pendiente',
        });

        res.status(201).json({
            message: conductorAsignado
                ? 'Viaje solicitado. El conductor ha sido notificado y debe aceptarlo.'
                : 'Viaje solicitado exitosamente',
            trip: newTrip,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al solicitar viaje', error: error.message });
    }
};

// ============================================================
// 2. Obtener viajes pendientes (conductor)
// ============================================================
const getPendingTrips = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo conductores pueden ver viajes pendientes.' });
        }

        if (!user.provincia || !user.municipio) {
            return res.status(400).json({
                message: 'Debes tener provincia y municipio configurados en tu perfil.'
            });
        }

        const viajeActivo = await Trip.findOne({
            where: {
                conductor_id: user.id,
                estado: 'en_curso'
            }
        });

        const solicitudesDirectas = await Trip.findAll({
            where: {
                estado: 'pendiente',
                conductor_id: user.id,
            },
            include: [
                {
                    model: User,
                    as: 'pasajero',
                    attributes: ['id', 'nombre_completo', 'telefono', 'provincia', 'municipio']
                }
            ],
            order: [['createdAt', 'ASC']],
        });

        const viajesAbiertos = await Trip.findAll({
            where: {
                estado: 'pendiente',
                conductor_id: null,
                origen_provincia: user.provincia,
                origen_municipio: user.municipio,
            },
            include: [
                {
                    model: User,
                    as: 'pasajero',
                    attributes: ['id', 'nombre_completo', 'telefono', 'provincia', 'municipio']
                }
            ],
            order: [['createdAt', 'ASC']],
        });

        res.json({
            tiene_viaje_activo: !!viajeActivo,
            viaje_activo_id: viajeActivo ? viajeActivo.id : null,
            disponible: user.disponible,
            solicitudes_directas: solicitudesDirectas,
            viajes_abiertos: viajesAbiertos,
            viajes: [...solicitudesDirectas, ...viajesAbiertos]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener viajes pendientes', error: error.message });
    }
};

// ============================================================
// 3. Aceptar viaje (conductor)
// ============================================================
const acceptTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        const conductor_id = req.user.id;

        const user = await User.findByPk(conductor_id);
        if (user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo conductores pueden aceptar viajes.' });
        }

        const viajeActivo = await Trip.findOne({
            where: {
                conductor_id: user.id,
                estado: 'en_curso'
            }
        });
        if (viajeActivo) {
            return res.status(400).json({
                message: 'Ya tienes un viaje en curso. Finalízalo antes de aceptar otro.'
            });
        }

        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Viaje no encontrado.' });
        }

        if (trip.estado !== 'pendiente') {
            return res.status(400).json({ message: 'Este viaje ya no está disponible.' });
        }

        if (trip.conductor_id && Number(trip.conductor_id) !== Number(conductor_id)) {
            return res.status(403).json({
                message: 'Este viaje está reservado para otro conductor.'
            });
        }

        if (
            trip.origen_provincia !== user.provincia ||
            trip.origen_municipio !== user.municipio
        ) {
            return res.status(403).json({
                message: `Este viaje es de ${trip.origen_provincia}, ${trip.origen_municipio}. Solo puedes aceptar viajes en tu zona.`
            });
        }

        trip.conductor_id = conductor_id;
        trip.estado = 'en_curso';
        await trip.save();

        res.json({
            message: 'Viaje aceptado exitosamente',
            trip,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al aceptar viaje', error: error.message });
    }
};

// ============================================================
// 4. Finalizar viaje
// ============================================================
const completeTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        const conductor_id = req.user.id;
        const { tarifa_final } = req.body;

        if (!tarifa_final || tarifa_final <= 0) {
            return res.status(400).json({ message: 'Debe proporcionar una tarifa final válida.' });
        }

        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Viaje no encontrado.' });
        }

        if (Number(trip.conductor_id) !== Number(conductor_id)) {
            return res.status(403).json({ message: 'No eres el conductor asignado a este viaje.' });
        }

        if (trip.estado !== 'en_curso') {
            return res.status(400).json({ message: 'Solo se pueden finalizar viajes en curso.' });
        }

        trip.estado = 'finalizado';
        trip.tarifa_final = tarifa_final;
        await trip.save();

        res.json({
            message: 'Viaje finalizado exitosamente',
            trip,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al finalizar viaje', error: error.message });
    }
};

// ============================================================
// 5. Cancelar viaje
// ============================================================
const cancelTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        const userId = req.user.id;

        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Viaje no encontrado.' });
        }

        if (Number(trip.pasajero_id) !== Number(userId) && Number(trip.conductor_id) !== Number(userId)) {
            return res.status(403).json({ message: 'No tienes permiso para cancelar este viaje.' });
        }

        if (trip.estado === 'finalizado') {
            return res.status(400).json({ message: 'No se puede cancelar un viaje ya finalizado.' });
        }

        trip.estado = 'cancelado';
        await trip.save();

        res.json({
            message: 'Viaje cancelado exitosamente',
            trip,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cancelar viaje', error: error.message });
    }
};

// ============================================================
// 6. Historial de viajes
// ============================================================
const getUserTrips = async (req, res) => {
    try {
        const userId = req.user.id;

        const trips = await Trip.findAll({
            where: {
                [Op.or]: [{ pasajero_id: userId }, { conductor_id: userId }]
            },
            include: [
                { model: User, as: 'pasajero', attributes: ['id', 'nombre_completo', 'telefono', 'provincia', 'municipio'] },
                { model: User, as: 'conductor', attributes: ['id', 'nombre_completo', 'telefono', 'provincia', 'municipio'] }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(trips);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener historial', error: error.message });
    }
};

// ============================================================
// 7. Buscar vehículos disponibles (solo conductores disponibles)
// ============================================================
const getAvailableVehicles = async (req, res) => {
    try {
        const pasajero_id = req.user.id;
        const { cantidad_pasajeros } = req.body;

        if (!cantidad_pasajeros || cantidad_pasajeros < 1) {
            return res.status(400).json({ message: 'Debes indicar la cantidad de pasajeros.' });
        }

        const pasajero = await User.findByPk(pasajero_id);
        if (!pasajero) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (!pasajero.provincia || !pasajero.municipio) {
            return res.status(400).json({
                message: 'Debes tener provincia y municipio configurados en tu perfil.'
            });
        }

        const conductores = await User.findAll({
            where: {
                tipo_usuario: 'conductor',
                provincia: pasajero.provincia,
                municipio: pasajero.municipio,
                vehiculo_registrado: true,
                disponible: true,
                cantidad_pasajeros: { [Op.gte]: cantidad_pasajeros },
            },
            attributes: [
                'id',
                'nombre_completo',
                'telefono',
                'tipo_vehiculo',
                'cantidad_pasajeros',
                'climatizado',
                'tarifa_por_km',
                'provincia',
                'municipio',
                'disponible'
            ],
            order: [['tarifa_por_km', 'ASC']],
        });

        const conductoresConViajeActivo = await Trip.findAll({
            where: {
                estado: 'en_curso',
                conductor_id: { [Op.in]: conductores.map(c => c.id) }
            },
            attributes: ['conductor_id']
        });

        const idsOcupados = conductoresConViajeActivo.map(t => t.conductor_id);
        const conductoresLibres = conductores.filter(c => !idsOcupados.includes(c.id));

        res.json({
            zona: `${pasajero.municipio}, ${pasajero.provincia}`,
            cantidad_solicitada: cantidad_pasajeros,
            total: conductoresLibres.length,
            conductores: conductoresLibres
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al buscar vehículos', error: error.message });
    }
};

// ============================================================
// 8. Rechazar viaje (conductor)
// ============================================================
const rejectTrip = async (req, res) => {
    try {
        const tripId = req.params.id;
        const conductor_id = req.user.id;

        const user = await User.findByPk(conductor_id);
        if (user.tipo_usuario !== 'conductor') {
            return res.status(403).json({ message: 'Solo conductores pueden rechazar viajes.' });
        }

        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Viaje no encontrado.' });
        }

        if (trip.estado !== 'pendiente') {
            return res.status(400).json({ message: 'Solo se pueden rechazar viajes pendientes.' });
        }

        if (Number(trip.conductor_id) !== Number(conductor_id)) {
            return res.status(403).json({
                message: 'Este viaje no está asignado a ti. No puedes rechazarlo.'
            });
        }

        trip.conductor_id = null;
        await trip.save();

        res.json({
            message: 'Viaje rechazado. Quedará disponible para otros conductores.',
            trip,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al rechazar viaje', error: error.message });
    }
};

// ============================================================
// 9. Actualizar ubicación del conductor
// ============================================================
const updateLocation = async (req, res) => {
    try {
        const tripId = req.params.id;
        const conductor_id = req.user.id;
        const { latitud, longitud } = req.body;

        if (!latitud || !longitud) {
            return res.status(400).json({ message: 'Se requieren latitud y longitud.' });
        }

        const trip = await Trip.findByPk(tripId);
        if (!trip) {
            return res.status(404).json({ message: 'Viaje no encontrado.' });
        }

        if (Number(trip.conductor_id) !== Number(conductor_id)) {
            return res.status(403).json({ message: 'No eres el conductor asignado a este viaje.' });
        }

        if (trip.estado !== 'en_curso') {
            return res.status(400).json({ message: 'Solo se puede actualizar la ubicación en viajes en curso.' });
        }

        trip.conductor_latitud = latitud;
        trip.conductor_longitud = longitud;
        trip.conductor_ultima_actualizacion = new Date();
        await trip.save();

        res.json({
            message: 'Ubicación actualizada',
            trip: {
                id: trip.id,
                conductor_latitud: trip.conductor_latitud,
                conductor_longitud: trip.conductor_longitud,
                conductor_ultima_actualizacion: trip.conductor_ultima_actualizacion,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar ubicación', error: error.message });
    }
};

module.exports = {
    createTrip,
    getPendingTrips,
    acceptTrip,
    completeTrip,
    cancelTrip,
    getUserTrips,
    getAvailableVehicles,
    rejectTrip,
    updateLocation
};