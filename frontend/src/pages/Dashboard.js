import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Modal, Badge,
  Table, Alert, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import authService from '../services/authService';
import cubaData from '../data/cubaData.json';
import Layout from '../components/Layout';
import MapaSeleccionRuta from '../components/MapaSeleccionRuta';
import MapaRuta from '../components/MapaRuta';
import MapaPatrullas from '../components/MapaPatrullas';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [, setPendingTrips] = useState([]);
  const [solicitudesDirectas, setSolicitudesDirectas] = useState([]);
  const [viajesAbiertos, setViajesAbiertos] = useState([]);
  const [tieneViajeActivo, setTieneViajeActivo] = useState(false);
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverMessage, setDriverMessage] = useState('');
  const [driverLoading, setDriverLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre_completo: '',
    telefono: '',
    direccion: '',
    provincia: '',
    municipio: ''
  });
  const [municipios, setMunicipios] = useState([]);
  const [editMessage, setEditMessage] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [notificacion, setNotificacion] = useState('');

  // ===== ESTADOS DEL VEHÍCULO =====
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    tipo_vehiculo: '',
    cantidad_pasajeros: '',
    climatizado: false,
    tarifa_por_km: ''
  });
  const [vehicleMessage, setVehicleMessage] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState(null);

  // ===== ESTADOS PARA BÚSQUEDA DE VEHÍCULOS =====
  const [cantidadPasajeros, setCantidadPasajeros] = useState(1);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);
  const [buscandoVehiculos, setBuscandoVehiculos] = useState(false);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // ===== ESTADOS DE UBICACIÓN GPS =====
  const [ubicacion, setUbicacion] = useState({ latitud: null, longitud: null });
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  // ===== ESTADOS PARA SELECCIÓN DE RUTA EN MAPA =====
  const [origenCoords, setOrigenCoords] = useState(null);
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [rutaInfo, setRutaInfo] = useState(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  // ===== ESTADOS PARA MODAL DE FINALIZAR VIAJE =====
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeTripId, setCompleteTripId] = useState(null);
  const [completeTarifa, setCompleteTarifa] = useState('');
  const [completeMessage, setCompleteMessage] = useState('');

  // ===== ESTADO PARA DISPONIBILIDAD DEL CONDUCTOR =====
  const [disponibilidadLoading, setDisponibilidadLoading] = useState(false);

  // ===== ESTADO PARA MODAL DE PATRULLAS =====
  const [showPatrolModal, setShowPatrolModal] = useState(false);

  // ===== ESTADOS PARA SUSCRIPCIÓN =====
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [miSolicitud, setMiSolicitud] = useState(null);
  const [codigoConductor, setCodigoConductor] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // ===== ESTADO PARA NÚMERO DE TARJETA DEL ADMIN =====
  const [numeroTarjetaAdmin, setNumeroTarjetaAdmin] = useState(null);

  const prevTripsRef = useRef(null);

  // ============================================================
  // GEOLOCALIZACIÓN
  // ============================================================
  const obtenerUbicacion = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitud: null, longitud: null });
        return;
      }
      setObteniendoUbicacion(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
          };
          setUbicacion(coords);
          setObteniendoUbicacion(false);
          resolve(coords);
        },
        (err) => {
          console.warn('Error al obtener ubicación:', err.message);
          setObteniendoUbicacion(false);
          resolve({ latitud: null, longitud: null });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // ============================================================
  // FETCH DATA
  // ============================================================
  const fetchTrips = useCallback(async () => {
    try {
      const response = await axios.get('/api/trips/my');
      // 🔑 Asegurar que siempre sea un array
      const data = Array.isArray(response.data) ? response.data : [];
      setTrips(data);
      return data;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      setTrips([]);
      return [];
    }
  }, []);

  const fetchPendingTrips = useCallback(async () => {
    try {
      const response = await axios.get('/api/trips/pending');
      setSolicitudesDirectas(Array.isArray(response.data.solicitudes_directas) ? response.data.solicitudes_directas : []);
      setViajesAbiertos(Array.isArray(response.data.viajes_abiertos) ? response.data.viajes_abiertos : []);
      setPendingTrips(Array.isArray(response.data.viajes) ? response.data.viajes : []);
      setTieneViajeActivo(response.data.tiene_viaje_activo || false);

      if (typeof response.data.disponible === 'boolean') {
        setUser(prev => {
          if (!prev) return prev;
          if (prev.disponible === response.data.disponible) return prev;
          return { ...prev, disponible: response.data.disponible };
        });
      }

      return Array.isArray(response.data.viajes) ? response.data.viajes : [];
    } catch (error) {
      console.error('Error al obtener viajes pendientes:', error);
      setSolicitudesDirectas([]);
      setViajesAbiertos([]);
      setPendingTrips([]);
      return [];
    }
  }, []);

  const fetchData = useCallback(async (tipoUsuario) => {
    setLoading(true);
    try {
      await fetchTrips();
      if (tipoUsuario === 'conductor') {
        await fetchPendingTrips();
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTrips, fetchPendingTrips]);

  const fetchVehicle = useCallback(async () => {
    try {
      const response = await axios.get('/api/users/vehicle');
      setVehicleInfo(response.data);
      setVehicleForm({
        tipo_vehiculo: response.data.tipo_vehiculo || '',
        cantidad_pasajeros: response.data.cantidad_pasajeros || '',
        climatizado: response.data.climatizado || false,
        tarifa_por_km: response.data.tarifa_por_km || ''
      });
    } catch (error) {
      console.error('Error al obtener vehículo:', error);
    }
  }, []);

  // ============================================================
  // SUSCRIPCIÓN
  // ============================================================
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user || user.tipo_usuario !== 'conductor') return;
    try {
      const response = await axios.get('/api/subscriptions/my-request');
      setSubscriptionStatus(response.data.suscripcion);
      setMiSolicitud(response.data.solicitud);
      if (response.data.suscripcion?.activa) {
        setUser(prev => ({
          ...prev,
          subscription_expires_at: response.data.suscripcion.expira,
        }));
      }
    } catch (error) {
      console.warn('No se pudo verificar suscripción:', error.message);
      setSubscriptionStatus({ activa: false, expira: null, diasRestantes: 0 });
      setMiSolicitud(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario]);

  const enviarCodigoSuscripcion = async (e) => {
    e.preventDefault();
    setSubscriptionMessage('');
    if (!codigoConductor.trim()) {
      setSubscriptionMessage('Debes ingresar un código.');
      return;
    }
    setSubscriptionLoading(true);
    try {
      const response = await axios.post('/api/subscriptions/request', {
        codigo_conductor: codigoConductor.trim(),
      });
      setSubscriptionMessage(response.data.message);
      setCodigoConductor('');
      await fetchSubscriptionStatus();
      setTimeout(() => {
        setShowSubscriptionModal(false);
        setSubscriptionMessage('');
      }, 2500);
    } catch (error) {
      setSubscriptionMessage(error.response?.data?.message || 'Error al enviar código');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // ============================================================
  // EFECTO 1: Cargar usuario
  // ============================================================
  useEffect(() => {
    const cargarUsuario = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      authService.setAuthToken(token);

      let userData = null;
      try {
        userData = await authService.fetchCurrentUser();
      } catch (e) {
        console.warn('No se pudo obtener /users/me, usando datos del token');
      }

      if (!userData) userData = authService.getCurrentUser();
      if (!userData) {
        navigate('/login');
        return;
      }

      const normalizedUser = {
        ...userData,
        id: Number(userData.id),
        disponible: !!userData.disponible,
      };
      setUser(normalizedUser);

      setEditForm({
        nombre_completo: userData.nombre_completo || '',
        telefono: userData.telefono || '',
        direccion: userData.direccion || '',
        provincia: userData.provincia || '',
        municipio: userData.municipio || ''
      });
      if (userData.provincia) {
        const prov = cubaData.provincias.find(p => p.nombre === userData.provincia);
        setMunicipios(prov ? prov.municipios : []);
      }
    };
    cargarUsuario();
  }, [navigate]);

  // ============================================================
  // EFECTO 1.5: Cargar número de tarjeta del admin
  // ============================================================
  useEffect(() => {
    const cargarTarjeta = async () => {
      try {
        const response = await axios.get('/api/admin/payment-info');
        if (response.data.numero_tarjeta) {
          setNumeroTarjetaAdmin(response.data.numero_tarjeta);
        }
      } catch (error) {
        console.warn('No se pudo cargar el número de tarjeta:', error.message);
      }
    };
    if (user) cargarTarjeta();
  }, [user]);

  // ============================================================
  // EFECTO 2: Cargar viajes
  // ============================================================
  useEffect(() => {
    if (!user) return;
    fetchData(user.tipo_usuario);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario, refresh, fetchData]);

  // ============================================================
  // EFECTO 2.5: Cargar vehículo si es conductor
  // ============================================================
  useEffect(() => {
    if (!user || user.tipo_usuario !== 'conductor') return;
    fetchVehicle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario, fetchVehicle]);

  // ============================================================
  // EFECTO 2.7: Cargar estado de suscripción si es conductor
  // ============================================================
  useEffect(() => {
    if (!user || user.tipo_usuario !== 'conductor') return;
    fetchSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario, fetchSubscriptionStatus]);

  // ============================================================
  // EFECTO 2.8: Refrescar suscripción cada 30 segundos
  // ============================================================
  useEffect(() => {
    if (!user || user.tipo_usuario !== 'conductor') return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get('/api/subscriptions/my-request');
        const nuevaSuscripcion = response.data.suscripcion;
        const nuevaSolicitud = response.data.solicitud;

        const estabaInactiva = !subscriptionStatus?.activa;
        const ahoraActiva = nuevaSuscripcion?.activa;

        setSubscriptionStatus(nuevaSuscripcion);
        setMiSolicitud(nuevaSolicitud);

        if (estabaInactiva && ahoraActiva) {
          setNotificacion(
            `¡Tu suscripción ha sido aprobada! Válida por ${nuevaSuscripcion.diasRestantes} día(s).`
          );
          setTimeout(() => setNotificacion(''), 8000);
        }
      } catch (error) {
        console.warn('Error al refrescar suscripción:', error.message);
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario]);

  // ============================================================
  // EFECTO 3: POLLING cada 8 segundos
  // ============================================================
  useEffect(() => {
    if (!user) return;

    const compararTrips = (prev, nuevo) => {
      const prevStr = JSON.stringify(prev.map(t => ({ id: t.id, estado: t.estado, conductor_id: t.conductor_id })));
      const newStr = JSON.stringify(nuevo.map(t => ({ id: t.id, estado: t.estado, conductor_id: t.conductor_id })));
      return prevStr === newStr;
    };

    const interval = setInterval(async () => {
      try {
        const nuevosTrips = await axios.get('/api/trips/my').then(r => Array.isArray(r.data) ? r.data : []);
        setTrips(prev => compararTrips(prev, nuevosTrips) ? prev : nuevosTrips);

        if (user.tipo_usuario === 'conductor') {
          await fetchPendingTrips();
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario, fetchPendingTrips]);

  // ============================================================
  // EFECTO 3.5: Enviar ubicación del conductor cada 60 segundos
  // ============================================================
  const viajeActivoParaEfecto = Array.isArray(trips)
    ? trips.find(t => t.estado === 'en_curso' && Number(t.conductor_id) === Number(user?.id))
    : null;

  useEffect(() => {
    if (!user || user.tipo_usuario !== 'conductor') return;
    if (!viajeActivoParaEfecto) return;

    const enviarUbicacion = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axios.put(`/api/trips/${viajeActivoParaEfecto.id}/location`, {
              latitud: pos.coords.latitude,
              longitud: pos.coords.longitude,
            });
          } catch (error) {
            console.error('Error al enviar ubicación:', error);
          }
        },
        (err) => console.warn('Error de geolocalización:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    enviarUbicacion();
    const interval = setInterval(enviarUbicacion, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.tipo_usuario, viajeActivoParaEfecto?.id]);

  // ============================================================
  // EFECTO 4: Notificación al pasajero
  // ============================================================
  useEffect(() => {
    if (!user || user.tipo_usuario !== 'pasajero') return;
    if (!Array.isArray(trips) || !trips.length) {
      prevTripsRef.current = Array.isArray(trips) ? trips : [];
      return;
    }
    if (prevTripsRef.current === null) {
      prevTripsRef.current = trips;
      return;
    }
    trips.forEach((trip) => {
      const prev = prevTripsRef.current.find(t => t.id === trip.id);
      if (prev && prev.estado !== trip.estado) {
        if (prev.estado === 'pendiente' && trip.estado === 'en_curso') {
          setNotificacion(`¡Tu viaje a "${trip.destino}" ha sido aceptado por un conductor!`);
          setTimeout(() => setNotificacion(''), 8000);
        }
      }
    });
    prevTripsRef.current = trips;
  }, [trips, user]);

  // ============================================================
  // FUNCIONES DE VIAJES
  // ============================================================
  const buscarVehiculos = async (e) => {
    e.preventDefault();
    if (!origen || !destino) {
      alert('Completa origen y destino.');
      return;
    }
    if (!user.provincia || !user.municipio) {
      alert('Debes configurar tu provincia y municipio en tu perfil.');
      setShowEditModal(true);
      return;
    }

    setBuscandoVehiculos(true);
    setVehiculosDisponibles([]);
    setVehiculoSeleccionado(null);
    setBusquedaRealizada(true);

    if (!origenCoords) {
      await obtenerUbicacion();
    }

    try {
      const response = await axios.post('/api/trips/available-vehicles', {
        cantidad_pasajeros: parseInt(cantidadPasajeros, 10)
      });
      setVehiculosDisponibles(response.data.conductores);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al buscar vehículos');
    } finally {
      setBuscandoVehiculos(false);
    }
  };

  const solicitarVehiculoEspecifico = async () => {
    if (!vehiculoSeleccionado) {
      alert('Selecciona un vehículo.');
      return;
    }

    let coords = ubicacion;
    if (!origenCoords && (!coords.latitud || !coords.longitud)) {
      coords = await obtenerUbicacion();
    }

    const latFinal = origenCoords?.lat || coords.latitud;
    const lngFinal = origenCoords?.lng || coords.longitude || coords.longitud;
    const destinoLat = destinoCoords?.lat || null;
    const destinoLng = destinoCoords?.lng || null;
    const distanciaKm = rutaInfo?.distancia ? parseFloat(rutaInfo.distancia) : null;

    try {
      await axios.post('/api/trips', {
        origen,
        destino,
        conductor_id: vehiculoSeleccionado.id,
        latitud: latFinal,
        longitud: lngFinal,
        destino_latitud: destinoLat,
        destino_longitud: destinoLng,
        distancia_km: distanciaKm,
      });

      alert(`¡Viaje solicitado! El conductor ${vehiculoSeleccionado.nombre_completo} ha sido notificado con tu ubicación.`);
      setOrigen('');
      setDestino('');
      setCantidadPasajeros(1);
      setVehiculosDisponibles([]);
      setVehiculoSeleccionado(null);
      setBusquedaRealizada(false);
      setUbicacion({ latitud: null, longitud: null });
      setOrigenCoords(null);
      setDestinoCoords(null);
      setRutaInfo(null);
      setMostrarMapa(false);
      fetchTrips();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al solicitar viaje');
    }
  };

  const aceptarViaje = async (tripId) => {
    try {
      await axios.put(`/api/trips/${tripId}/accept`);
      alert('Viaje aceptado. ¡Buen viaje!');
      fetchPendingTrips();
      fetchTrips();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al aceptar viaje');
    }
  };

  const rechazarViaje = async (tripId) => {
    if (!window.confirm('¿Seguro que quieres rechazar este viaje? Quedará disponible para otros conductores.')) return;
    try {
      await axios.put(`/api/trips/${tripId}/reject`);
      alert('Viaje rechazado. Quedará disponible para otros conductores.');
      fetchPendingTrips();
      fetchTrips();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al rechazar viaje');
    }
  };

  const abrirModalFinalizar = (tripId) => {
    setCompleteTripId(tripId);
    setCompleteTarifa('');
    setCompleteMessage('');
    setShowCompleteModal(true);
  };

  const confirmarFinalizarViaje = async () => {
    if (!completeTarifa || isNaN(completeTarifa) || parseFloat(completeTarifa) <= 0) {
      setCompleteMessage('Debe ingresar una tarifa válida mayor a 0.');
      return;
    }

    try {
      await axios.put(`/api/trips/${completeTripId}/complete`, {
        tarifa_final: parseFloat(completeTarifa)
      });
      setCompleteMessage('¡Viaje finalizado exitosamente!');

      setTimeout(() => {
        setShowCompleteModal(false);
        setCompleteTripId(null);
        setCompleteTarifa('');
        setCompleteMessage('');
        fetchTrips();
        if (user.tipo_usuario === 'conductor') fetchPendingTrips();
      }, 1500);
    } catch (error) {
      setCompleteMessage(error.response?.data?.message || 'Error al finalizar viaje');
    }
  };

  const cancelarViaje = async (tripId) => {
    if (!window.confirm('¿Estás seguro de cancelar este viaje?')) return;
    try {
      await axios.put(`/api/trips/${tripId}/cancel`);
      alert('Viaje cancelado');
      fetchTrips();
      if (user.tipo_usuario === 'conductor') fetchPendingTrips();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar viaje');
    }
  };

  // ============================================================
  // DISPONIBILIDAD DEL CONDUCTOR
  // ============================================================
  const toggleDisponibilidad = async () => {
    if (!vehicleInfo?.vehiculo_registrado) {
      alert('Debes registrar tu vehículo primero antes de ponerte disponible.');
      setShowVehicleModal(true);
      return;
    }

    if (!subscriptionStatus?.activa) {
      alert('Necesitas una suscripción activa para ponerte disponible. Haz clic en "Comprar Suscripción".');
      setShowSubscriptionModal(true);
      return;
    }

    setDisponibilidadLoading(true);
    try {
      const response = await axios.put('/api/users/toggle-availability', {
        disponible: !user.disponible
      });
      setUser({ ...user, disponible: response.data.user.disponible });
      setVehicleInfo(prev => ({ ...prev, disponible: response.data.user.disponible }));
      alert(response.data.message);
      setRefresh(!refresh);
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cambiar disponibilidad');
    } finally {
      setDisponibilidadLoading(false);
    }
  };

  // ============================================================
  // EDICIÓN DE PERFIL
  // ============================================================
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
    if (name === 'provincia') {
      const prov = cubaData.provincias.find(p => p.nombre === value);
      setMunicipios(prov ? prov.municipios : []);
      setEditForm({ ...editForm, provincia: value, municipio: '' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditMessage('');
    try {
      await axios.put('/api/users/profile', editForm);
      setEditMessage('Perfil actualizado correctamente');
      setUser({ ...user, ...editForm });
      setTimeout(() => {
        setShowEditModal(false);
        setRefresh(!refresh);
      }, 1500);
    } catch (error) {
      setEditMessage(error.response?.data?.message || 'Error al actualizar perfil');
    }
  };

  // ============================================================
  // CONVERTIRSE EN CONDUCTOR
  // ============================================================
  const handleBecomeDriver = async () => {
    setDriverLoading(true);
    setDriverMessage('');
    try {
      const response = await axios.put('/api/users/become-driver');
      if (response.data.token) {
        authService.setAuthToken(response.data.token);
      }
      setDriverMessage('¡Felicidades! Ahora eres conductor. Recargando...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setDriverMessage(error.response?.data?.message || 'Error al cambiar a conductor');
      setDriverLoading(false);
    }
  };

  // ============================================================
  // VEHÍCULO — Guardar
  // ============================================================
  const handleVehicleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVehicleForm({
      ...vehicleForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setVehicleMessage('');
    if (!user.provincia || !user.municipio) {
      setVehicleMessage('Debes configurar tu provincia y municipio en tu perfil antes de guardar el vehículo.');
      setTimeout(() => {
        setShowVehicleModal(false);
        setShowEditModal(true);
      }, 2000);
      return;
    }
    setVehicleLoading(true);
    try {
      const response = await axios.put('/api/users/vehicle', {
        tipo_vehiculo: vehicleForm.tipo_vehiculo,
        cantidad_pasajeros: parseInt(vehicleForm.cantidad_pasajeros, 10),
        climatizado: vehicleForm.climatizado,
        tarifa_por_km: parseFloat(vehicleForm.tarifa_por_km)
      });
      setVehicleMessage('Vehículo guardado correctamente');
      setVehicleInfo(response.data.user);
      setUser({ ...user, ...response.data.user });
      setTimeout(() => {
        setShowVehicleModal(false);
        setVehicleMessage('');
      }, 1500);
    } catch (error) {
      setVehicleMessage(error.response?.data?.message || 'Error al guardar vehículo');
    } finally {
      setVehicleLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!user || loading) {
    return (
      <Layout>
        <Container className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando...</p>
        </Container>
      </Layout>
    );
  }

  // 🔑 PROTECCIÓN: Asegurar que trips sea array antes de usar .find()
  const viajeActivo = Array.isArray(trips)
    ? trips.find(t => t.estado === 'en_curso' && Number(t.conductor_id) === Number(user.id))
    : null;

  const miViajeActivoPasajero = Array.isArray(trips)
    ? trips.find(t => (t.estado === 'en_curso' || t.estado === 'pendiente') && Number(t.pasajero_id) === Number(user.id))
    : null;

  return (
    <Layout>
      <Container className="py-4">
        {notificacion && (
          <Alert variant="success" dismissible onClose={() => setNotificacion('')} className="shadow-sm">
            <i className="fas fa-bell me-2"></i>
            {notificacion}
          </Alert>
        )}

        {/* TARJETA DE BIENVENIDA */}
        <Row className="mb-4">
          <Col>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                <Row className="align-items-center">
                  <Col md={8}>
                    <h2 className="fw-bold">
                      <i className="fas fa-hand-wave text-primary me-2"></i>
                      Bienvenido, {user.nombre_completo || user.email}
                    </h2>
                    <p className="text-muted mb-1">
                      <i className="fas fa-envelope me-2"></i>{user.email}
                    </p>
                    <p className="text-muted mb-1">
                      <i className="fas fa-user-badge me-2"></i>
                      <Badge bg={user.tipo_usuario === 'conductor' ? 'success' : user.tipo_usuario === 'admin' ? 'dark' : 'primary'} pill>
                        {user.tipo_usuario === 'conductor' ? 'Conductor' : user.tipo_usuario === 'admin' ? 'Administrador' : 'Pasajero'}
                      </Badge>
                    </p>
                    {(user.provincia || user.municipio) && (
                      <p className="text-muted mb-1">
                        <i className="fas fa-map-marker-alt me-2"></i>
                        {user.provincia}, {user.municipio}
                      </p>
                    )}
                    {user.tipo_usuario === 'conductor' && vehicleInfo && vehicleInfo.vehiculo_registrado && (
                      <p className="text-muted mb-1">
                        <i className="fas fa-car me-2"></i>
                        <strong>Vehículo:</strong> {vehicleInfo.tipo_vehiculo?.replace('_', ' ')} · {vehicleInfo.cantidad_pasajeros} pasajeros
                        {vehicleInfo.climatizado && ' · Climatizado'}
                        {' · '}
                        <strong>${vehicleInfo.tarifa_por_km}/km</strong>
                      </p>
                    )}
                    {user.tipo_usuario === 'conductor' && vehicleInfo?.vehiculo_registrado && (
                      <p className="text-muted mb-1">
                        <i className="fas fa-circle me-2" style={{
                          color: user.disponible ? '#28a745' : '#dc3545',
                          fontSize: '0.7em',
                          verticalAlign: 'middle'
                        }}></i>
                        <strong>Estado:</strong>{' '}
                        {user.disponible ? (
                          <Badge bg="success">Disponible para trabajar</Badge>
                        ) : (
                          <Badge bg="secondary">Fuera de servicio</Badge>
                        )}
                      </p>
                    )}
                    {user.tipo_usuario === 'conductor' && subscriptionStatus && (
                      <p className="mb-0">
                        <i className="fas fa-id-card me-2" style={{
                          color: subscriptionStatus.activa ? '#28a745' : '#dc3545'
                        }}></i>
                        <strong>Suscripción:</strong>{' '}
                        {subscriptionStatus.activa ? (
                          <Badge bg="success">
                            Activa · {subscriptionStatus.diasRestantes} día(s)
                          </Badge>
                        ) : (
                          <Badge bg="danger">Vencida / No activa</Badge>
                        )}
                      </p>
                    )}
                  </Col>
                  <Col md={4} className="text-end">
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowEditModal(true)}
                      className="me-2 mb-2"
                    >
                      <i className="fas fa-user-edit me-2"></i>Editar Perfil
                    </Button>
                    {user.tipo_usuario === 'conductor' && (
                      <Button
                        variant="outline-success"
                        onClick={() => setShowVehicleModal(true)}
                        className="me-2 mb-2"
                      >
                        <i className="fas fa-car me-2"></i>Mi Vehículo
                      </Button>
                    )}
                    {user.tipo_usuario === 'conductor' && (
                      <Button
                        variant="outline-warning"
                        onClick={() => {
                          setSubscriptionMessage('');
                          setShowSubscriptionModal(true);
                          fetchSubscriptionStatus();
                        }}
                        className="me-2 mb-2"
                      >
                        <i className="fas fa-id-card me-2"></i>
                        {subscriptionStatus?.activa ? 'Mi Suscripción' : 'Comprar Suscripción'}
                      </Button>
                    )}
                    {user.tipo_usuario === 'conductor' && (
                      <Button
                        variant="danger"
                        onClick={() => setShowPatrolModal(true)}
                        className="me-2 mb-2"
                      >
                        <i className="fas fa-exclamation-triangle me-2"></i>Patrullas
                      </Button>
                    )}
                    {user.tipo_usuario === 'conductor' && vehicleInfo?.vehiculo_registrado && (
                      <Button
                        variant={user.disponible ? 'success' : 'warning'}
                        onClick={toggleDisponibilidad}
                        disabled={disponibilidadLoading}
                        className="mb-2"
                      >
                        {disponibilidadLoading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Cambiando...
                          </>
                        ) : user.disponible ? (
                          <>
                            <i className="fas fa-briefcase me-2"></i>Estoy Disponible
                          </>
                        ) : (
                          <>
                            <i className="fas fa-pause-circle me-2"></i>Fuera de Servicio
                          </>
                        )}
                      </Button>
                    )}
                    {user.tipo_usuario === 'admin' && (
                      <Button
                        variant="outline-danger"
                        onClick={() => navigate('/admin')}
                        className="mb-2"
                      >
                        <i className="fas fa-shield-alt me-2"></i>Panel Admin
                      </Button>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ================= PASAJERO ================= */}
        {user.tipo_usuario === 'pasajero' && (
          <>
            {miViajeActivoPasajero && (
              <Row className="mb-4">
                <Col md={12}>
                  <Card className="shadow-lg border-0 border-start border-4 border-info">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold mb-0 text-info">
                          <i className="fas fa-car-side me-2"></i>
                          {miViajeActivoPasajero.estado === 'pendiente'
                            ? 'Esperando que un conductor acepte...'
                            : 'Tu viaje está en curso'}
                        </h4>
                        <Badge bg={miViajeActivoPasajero.estado === 'pendiente' ? 'warning' : 'info'} pill>
                          {miViajeActivoPasajero.estado}
                        </Badge>
                      </div>
                      <Row>
                        <Col md={5}>
                          <p className="mb-1">
                            <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                            <strong>Origen:</strong> {miViajeActivoPasajero.origen}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-flag-checkered me-2 text-primary"></i>
                            <strong>Destino:</strong> {miViajeActivoPasajero.destino}
                          </p>
                          {miViajeActivoPasajero.distancia_km && (
                            <p className="mb-1">
                              <i className="fas fa-route me-2 text-primary"></i>
                              <strong>Distancia:</strong> {miViajeActivoPasajero.distancia_km} km
                            </p>
                          )}
                          {miViajeActivoPasajero.tarifa_por_km && (
                            <p className="mb-1">
                              <i className="fas fa-dollar-sign me-2 text-success"></i>
                              <strong>Tarifa por km:</strong> ${miViajeActivoPasajero.tarifa_por_km}
                            </p>
                          )}
                          <p className="mb-1">
                            <i className="fas fa-calculator me-2 text-success"></i>
                            <strong>Total estimado:</strong>{' '}
                            <span className="text-success fw-bold">
                              ${miViajeActivoPasajero.tarifa_estimada || 'A convenir'}
                            </span>
                          </p>
                          {miViajeActivoPasajero.conductor && (
                            <p className="mb-1">
                              <i className="fas fa-user me-2 text-primary"></i>
                              <strong>Conductor:</strong> {miViajeActivoPasajero.conductor.nombre_completo}
                            </p>
                          )}
                          {miViajeActivoPasajero.conductor && (
                            <p className="mb-1">
                              <i className="fas fa-phone me-2 text-primary"></i>
                              <strong>Teléfono:</strong> {miViajeActivoPasajero.conductor.telefono}
                            </p>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            className="mt-3"
                            onClick={() => cancelarViaje(miViajeActivoPasajero.id)}
                          >
                            <i className="fas fa-times-circle me-1"></i>Cancelar viaje
                          </Button>
                        </Col>
                        <Col md={7}>
                          <h6 className="fw-bold">
                            <i className="fas fa-map-marked-alt me-2 text-primary"></i>
                            Ubicación del conductor (actualiza cada minuto)
                          </h6>
                          <MapaRuta
                            origenLat={miViajeActivoPasajero.conductor_latitud || miViajeActivoPasajero.latitud}
                            origenLng={miViajeActivoPasajero.conductor_longitud || miViajeActivoPasajero.longitud}
                            destinoLat={miViajeActivoPasajero.destino_latitud}
                            destinoLng={miViajeActivoPasajero.destino_longitud}
                            altura="300px"
                            etiquetaOrigen="Conductor"
                            etiquetaDestino={miViajeActivoPasajero.destino}
                          />
                          {miViajeActivoPasajero.conductor_ultima_actualizacion && (
                            <small className="text-muted">
                              Última actualización del conductor:{' '}
                              {new Date(miViajeActivoPasajero.conductor_ultima_actualizacion).toLocaleTimeString('es-CU')}
                            </small>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {!miViajeActivoPasajero && (
              <Row className="mb-4">
                <Col md={12}>
                  <Card className="shadow-lg border-0">
                    <Card.Body className="p-4">
                      <div className="text-center mb-4">
                        <i className="fas fa-taxi fa-3x text-primary mb-3"></i>
                        <h4 className="fw-bold">Solicitar Viaje</h4>
                        <p className="text-muted small">Marca tu origen y destino en el mapa o escríbelos manualmente</p>
                      </div>

                      <div className="text-center mb-3">
                        <Button
                          variant={mostrarMapa ? 'outline-secondary' : 'outline-primary'}
                          onClick={() => setMostrarMapa(!mostrarMapa)}
                        >
                          <i className="fas fa-map-marked-alt me-2"></i>
                          {mostrarMapa ? 'Ocultar Mapa' : 'Seleccionar en el Mapa'}
                        </Button>
                      </div>

                      {mostrarMapa && (
                        <div className="mb-4">
                          <MapaSeleccionRuta
                            origen={origenCoords}
                            destino={destinoCoords}
                            onOrigenChange={setOrigenCoords}
                            onDestinoChange={setDestinoCoords}
                            onRutaCalculada={setRutaInfo}
                            altura="400px"
                          />
                          {rutaInfo && (
                            <Alert variant="info" className="mt-2 py-2 text-center">
                              <i className="fas fa-route me-2"></i>
                              <strong>Distancia:</strong> {rutaInfo.distancia} km |{' '}
                              <strong>Tiempo estimado:</strong> {rutaInfo.tiempo} min
                            </Alert>
                          )}
                        </div>
                      )}

                      <Form onSubmit={buscarVehiculos}>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-map-marker-alt me-2 text-primary"></i>Origen
                              </Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Ej: Calle 23 #45"
                                value={origen}
                                onChange={(e) => setOrigen(e.target.value)}
                                required={!origenCoords}
                              />
                              {origenCoords && (
                                <small className="text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  Coordenadas: {origenCoords.lat.toFixed(5)}, {origenCoords.lng.toFixed(5)}
                                </small>
                              )}
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-flag-checkered me-2 text-primary"></i>Destino
                              </Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="Ej: Plaza de la Revolución"
                                value={destino}
                                onChange={(e) => setDestino(e.target.value)}
                                required={!destinoCoords}
                              />
                              {destinoCoords && (
                                <small className="text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  Coordenadas: {destinoCoords.lat.toFixed(5)}, {destinoCoords.lng.toFixed(5)}
                                </small>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <i className="fas fa-users me-2 text-primary"></i>Cantidad de Pasajeros
                              </Form.Label>
                              <Form.Control
                                type="number"
                                min="1"
                                max="50"
                                value={cantidadPasajeros}
                                onChange={(e) => setCantidadPasajeros(e.target.value)}
                                required
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6} className="d-flex align-items-end mb-3">
                            <Button variant="primary" type="submit" className="w-100" disabled={buscandoVehiculos}>
                              {buscandoVehiculos ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Buscando...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-search me-2"></i>Buscar Vehículos
                                </>
                              )}
                            </Button>
                          </Col>
                        </Row>
                      </Form>

                      <div className="mb-3">
                        {obteniendoUbicacion && (
                          <Alert variant="info" className="py-2 small mb-0">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Obteniendo tu ubicación GPS...
                          </Alert>
                        )}
                        {!obteniendoUbicacion && ubicacion.latitud && !origenCoords && (
                          <Alert variant="success" className="py-2 small mb-0">
                            <i className="fas fa-map-marker-alt me-2"></i>
                            Ubicación GPS capturada correctamente.
                          </Alert>
                        )}
                      </div>

                      {busquedaRealizada && (
                        <div className="mt-4">
                          <hr />
                          {vehiculosDisponibles.length === 0 ? (
                            <Alert variant="warning" className="text-center">
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              No hay vehículos disponibles en tu zona que cumplan con las características.
                            </Alert>
                          ) : (
                            <>
                              <h5 className="fw-bold mb-3">
                                <i className="fas fa-car text-success me-2"></i>
                                Vehículos disponibles ({vehiculosDisponibles.length})
                              </h5>
                              <Row>
                                {vehiculosDisponibles.map((vehiculo) => (
                                  <Col md={6} key={vehiculo.id} className="mb-3">
                                    <Card
                                      className={`h-100 ${
                                        vehiculoSeleccionado?.id === vehiculo.id ? 'border-primary border-3' : ''
                                      }`}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => setVehiculoSeleccionado(vehiculo)}
                                    >
                                      <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start">
                                          <div>
                                            <h6 className="fw-bold mb-1">
                                              <i className="fas fa-user me-2"></i>
                                              {vehiculo.nombre_completo}
                                            </h6>
                                            <p className="text-muted small mb-1">
                                              <i className="fas fa-phone me-2"></i>{vehiculo.telefono}
                                            </p>
                                          </div>
                                          {vehiculoSeleccionado?.id === vehiculo.id && (
                                            <Badge bg="primary">
                                              <i className="fas fa-check"></i> Seleccionado
                                            </Badge>
                                          )}
                                        </div>
                                        <hr className="my-2" />
                                        <p className="mb-1">
                                          <i className="fas fa-truck me-2 text-primary"></i>
                                          <strong>Tipo:</strong> {vehiculo.tipo_vehiculo?.replace('_', ' ')}
                                        </p>
                                        <p className="mb-1">
                                          <i className="fas fa-users me-2 text-primary"></i>
                                          <strong>Capacidad:</strong> {vehiculo.cantidad_pasajeros} pasajeros
                                        </p>
                                        <p className="mb-1">
                                          <i className="fas fa-snowflake me-2 text-primary"></i>
                                          <strong>Climatizado:</strong>{' '}
                                          {vehiculo.climatizado ? (
                                            <Badge bg="info">Sí</Badge>
                                          ) : (
                                            <Badge bg="secondary">No</Badge>
                                          )}
                                        </p>
                                        <p className="mb-0">
                                          <i className="fas fa-dollar-sign me-2 text-success"></i>
                                          <strong>Tarifa por km:</strong>{' '}
                                          <span className="text-success fw-bold">${vehiculo.tarifa_por_km}/km</span>
                                        </p>
                                        {rutaInfo && (
                                          <p className="mb-0 mt-2 text-muted small">
                                            <i className="fas fa-route me-1"></i>
                                            Estimado para tu ruta ({rutaInfo.distancia} km):{' '}
                                            <strong className="text-success">
                                              ${(parseFloat(vehiculo.tarifa_por_km) * parseFloat(rutaInfo.distancia)).toFixed(2)}
                                            </strong>
                                          </p>
                                        )}
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                ))}
                              </Row>

                              {vehiculoSeleccionado && (
                                <div className="text-center mt-3">
                                  <Button
                                    variant="success"
                                    size="lg"
                                    onClick={solicitarVehiculoEspecifico}
                                  >
                                    <i className="fas fa-check-circle me-2"></i>
                                    Solicitar este vehículo
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* ================= CONDUCTOR ================= */}
        {user.tipo_usuario === 'conductor' && (
          <>
            {subscriptionStatus && !subscriptionStatus.activa && (
              <Alert variant="danger" className="mb-4 shadow-sm">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Tu suscripción está vencida o no existe.</strong> No aparecerás en las búsquedas de pasajeros ni podrás ver las patrullas.
                  </div>
                  <Button variant="warning" size="sm" onClick={() => setShowSubscriptionModal(true)}>
                    <i className="fas fa-id-card me-1"></i>Comprar Suscripción
                  </Button>
                </div>
              </Alert>
            )}

            {subscriptionStatus?.activa && subscriptionStatus.diasRestantes <= 5 && (
              <Alert variant="warning" className="mb-4 shadow-sm">
                <i className="fas fa-clock me-2"></i>
                <strong>Tu suscripción vence en {subscriptionStatus.diasRestantes} día(s).</strong> Renuévala pronto para seguir trabajando.
              </Alert>
            )}

            {!user.disponible && vehicleInfo?.vehiculo_registrado && subscriptionStatus?.activa && (
              <Alert variant="warning" className="mb-4 shadow-sm">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-pause-circle me-2"></i>
                    <strong>Estás fuera de servicio.</strong> No aparecerás en las búsquedas de pasajeros hasta que te pongas disponible.
                  </div>
                  <Button variant="success" size="sm" onClick={toggleDisponibilidad}>
                    <i className="fas fa-briefcase me-1"></i>Ponerme a trabajar
                  </Button>
                </div>
              </Alert>
            )}

            {viajeActivo && (
              <Row className="mb-4">
                <Col md={12}>
                  <Card className="shadow-lg border-0 border-start border-4 border-info">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold mb-0 text-info">
                          <i className="fas fa-car-side me-2"></i>Viaje en Curso
                        </h4>
                        <Badge bg="info" pill>
                          <i className="fas fa-spinner fa-spin me-1"></i>En curso
                        </Badge>
                      </div>
                      <Row>
                        <Col md={5}>
                          <p className="mb-1">
                            <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                            <strong>Origen:</strong> {viajeActivo.origen}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-flag-checkered me-2 text-primary"></i>
                            <strong>Destino:</strong> {viajeActivo.destino}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-user me-2 text-primary"></i>
                            <strong>Pasajero:</strong> {viajeActivo.pasajero?.nombre_completo || 'N/A'}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-phone me-2 text-primary"></i>
                            <strong>Teléfono:</strong> {viajeActivo.pasajero?.telefono || 'N/A'}
                          </p>
                          {viajeActivo.distancia_km && (
                            <p className="mb-1">
                              <i className="fas fa-route me-2 text-primary"></i>
                              <strong>Distancia:</strong> {viajeActivo.distancia_km} km
                            </p>
                          )}
                          {viajeActivo.tarifa_por_km && (
                            <p className="mb-1">
                              <i className="fas fa-dollar-sign me-2 text-success"></i>
                              <strong>Tu tarifa por km:</strong> ${viajeActivo.tarifa_por_km}
                            </p>
                          )}
                          <p className="mb-3">
                            <i className="fas fa-calculator me-2 text-success"></i>
                            <strong>Total estimado:</strong>{' '}
                            <span className="text-success fw-bold">${viajeActivo.tarifa_estimada || 'N/A'}</span>
                          </p>
                          <div className="mt-2 mb-3">
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={() => abrirModalFinalizar(viajeActivo.id)}
                            >
                              <i className="fas fa-check-circle me-1"></i>Finalizar Viaje
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => cancelarViaje(viajeActivo.id)}
                            >
                              <i className="fas fa-times-circle me-1"></i>Cancelar
                            </Button>
                          </div>
                          <Alert variant="info" className="py-2 small mb-0">
                            <i className="fas fa-satellite-dish me-2"></i>
                            Tu ubicación se envía al pasajero cada 1 minuto automáticamente.
                          </Alert>
                        </Col>
                        <Col md={7}>
                          <h6 className="fw-bold">
                            <i className="fas fa-route me-2 text-primary"></i>
                            Ruta a seguir (Origen → Destino)
                          </h6>
                          <MapaRuta
                            origenLat={viajeActivo.latitud}
                            origenLng={viajeActivo.longitud}
                            destinoLat={viajeActivo.destino_latitud}
                            destinoLng={viajeActivo.destino_longitud}
                            altura="300px"
                            etiquetaOrigen={`Recoger a ${viajeActivo.pasajero?.nombre_completo || 'pasajero'}`}
                            etiquetaDestino={viajeActivo.destino}
                          />
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {Array.isArray(solicitudesDirectas) && solicitudesDirectas.length > 0 && (
              <>
                <h5 className="fw-bold mb-3 text-success">
                  <i className="fas fa-user-check me-2"></i>Solicitudes directas para ti ({solicitudesDirectas.length})
                </h5>
                <Row className="mb-4">
                  {solicitudesDirectas.map((trip) => (
                    <Col md={6} key={trip.id} className="mb-3">
                      <Card className="h-100 shadow-sm border-0 border-start border-4 border-success">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <Badge bg="success">
                              <i className="fas fa-star me-1"></i>Para ti
                            </Badge>
                            <small className="text-muted">
                              {new Date(trip.createdAt).toLocaleTimeString('es-CU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          </div>
                          <p className="mb-1">
                            <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                            <strong>Origen:</strong> {trip.origen}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-flag-checkered me-2 text-primary"></i>
                            <strong>Destino:</strong> {trip.destino}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-user me-2 text-primary"></i>
                            <strong>Pasajero:</strong> {trip.pasajero?.nombre_completo || 'N/A'}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-phone me-2 text-primary"></i>
                            <strong>Teléfono:</strong> {trip.pasajero?.telefono || 'N/A'}
                          </p>
                          {trip.distancia_km && (
                            <p className="mb-1">
                              <i className="fas fa-route me-2 text-primary"></i>
                              <strong>Distancia:</strong> {trip.distancia_km} km
                            </p>
                          )}
                          <p className="mb-3">
                            <i className="fas fa-dollar-sign me-2 text-success"></i>
                            <strong>Total estimado:</strong>{' '}
                            <span className="text-success fw-bold">
                              {trip.tarifa_estimada ? `$${trip.tarifa_estimada}` : 'A convenir'}
                            </span>
                          </p>

                          <div className="mb-3">
                            <h6 className="fw-bold small">
                              <i className="fas fa-route me-2 text-primary"></i>
                              Ruta (Origen → Destino)
                            </h6>
                            <MapaRuta
                              origenLat={trip.latitud}
                              origenLng={trip.longitud}
                              destinoLat={trip.destino_latitud}
                              destinoLng={trip.destino_longitud}
                              altura="220px"
                              etiquetaOrigen={`Recoger a ${trip.pasajero?.nombre_completo || 'pasajero'}`}
                              etiquetaDestino={trip.destino}
                            />
                          </div>

                          <div className="d-flex gap-2">
                            <Button
                              variant={tieneViajeActivo ? 'secondary' : 'success'}
                              className="flex-fill"
                              disabled={tieneViajeActivo}
                              onClick={() => aceptarViaje(trip.id)}
                            >
                              {tieneViajeActivo ? (
                                <>
                                  <i className="fas fa-lock me-2"></i>Ocupado
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-check-circle me-2"></i>Aceptar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline-danger"
                              className="flex-fill"
                              disabled={tieneViajeActivo}
                              onClick={() => rechazarViaje(trip.id)}
                            >
                              <i className="fas fa-times-circle me-2"></i>Rechazar
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            <Row className="mb-4">
              <Col md={12}>
                <Card className="shadow-lg border-0">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold mb-0 text-warning">
                        <i className="fas fa-globe me-2"></i>Viajes abiertos en tu zona
                        {Array.isArray(viajesAbiertos) && viajesAbiertos.length > 0 && (
                          <Badge bg="danger" pill className="ms-2">
                            {viajesAbiertos.length}
                          </Badge>
                        )}
                      </h5>
                      <div>
                        <Badge bg="success" className="me-2">
                          <i className="fas fa-sync-alt me-1"></i>Actualización automática
                        </Badge>
                        <Button variant="outline-primary" size="sm" onClick={fetchPendingTrips}>
                          <i className="fas fa-sync-alt me-1"></i>Refrescar
                        </Button>
                      </div>
                    </div>

                    <Alert variant="info" className="py-2 small mb-3">
                      <i className="fas fa-map-marked-alt me-2"></i>
                      Mostrando solo viajes en <strong>{user.provincia}, {user.municipio}</strong>.
                    </Alert>

                    {tieneViajeActivo && (
                      <Alert variant="warning" className="py-2 small mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Ya tienes un <strong>viaje en curso</strong>. Finalízalo o cancélalo para poder aceptar otro.
                      </Alert>
                    )}

                    {!Array.isArray(viajesAbiertos) || viajesAbiertos.length === 0 ? (
                      <Alert variant="info" className="text-center">
                        <i className="fas fa-info-circle me-2"></i>
                        No hay viajes abiertos en tu zona. Esperando solicitudes...
                      </Alert>
                    ) : (
                      <Row>
                        {viajesAbiertos.map((trip) => (
                          <Col md={6} key={trip.id} className="mb-3">
                            <Card className="h-100 shadow-sm border-0 border-start border-4 border-warning">
                              <Card.Body>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <Badge bg="warning" text="dark">
                                    <i className="fas fa-clock me-1"></i>Solicitado
                                  </Badge>
                                  <small className="text-muted">
                                    {new Date(trip.createdAt).toLocaleTimeString('es-CU', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </small>
                                </div>

                                <p className="mb-1">
                                  <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                                  <strong>Origen:</strong> {trip.origen}
                                </p>
                                <p className="mb-1">
                                  <i className="fas fa-flag-checkered me-2 text-primary"></i>
                                  <strong>Destino:</strong> {trip.destino}
                                </p>
                                <p className="mb-1">
                                  <i className="fas fa-user me-2 text-primary"></i>
                                  <strong>Pasajero:</strong> {trip.pasajero?.nombre_completo || 'N/A'}
                                </p>
                                <p className="mb-1">
                                  <i className="fas fa-phone me-2 text-primary"></i>
                                  <strong>Teléfono:</strong> {trip.pasajero?.telefono || 'N/A'}
                                </p>
                                {trip.distancia_km && (
                                  <p className="mb-1">
                                    <i className="fas fa-route me-2 text-primary"></i>
                                    <strong>Distancia:</strong> {trip.distancia_km} km
                                  </p>
                                )}
                                <p className="mb-3">
                                  <i className="fas fa-dollar-sign me-2 text-success"></i>
                                  <strong>Total estimado:</strong>{' '}
                                  <span className="text-success fw-bold">
                                    {trip.tarifa_estimada ? `$${trip.tarifa_estimada}` : 'A convenir'}
                                  </span>
                                </p>

                                <div className="mb-3">
                                  <h6 className="fw-bold small">
                                    <i className="fas fa-route me-2 text-primary"></i>
                                    Ruta (Origen → Destino)
                                  </h6>
                                  <MapaRuta
                                    origenLat={trip.latitud}
                                    origenLng={trip.longitud}
                                    destinoLat={trip.destino_latitud}
                                    destinoLng={trip.destino_longitud}
                                    altura="220px"
                                    etiquetaOrigen={`Recoger a ${trip.pasajero?.nombre_completo || 'pasajero'}`}
                                    etiquetaDestino={trip.destino}
                                  />
                                </div>

                                <Button
                                  variant={tieneViajeActivo ? 'secondary' : 'primary'}
                                  className="w-100"
                                  disabled={tieneViajeActivo}
                                  onClick={() => aceptarViaje(trip.id)}
                                >
                                  {tieneViajeActivo ? (
                                    <>
                                      <i className="fas fa-lock me-2"></i>Ocupado en otro viaje
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-check-circle me-2"></i>Elegir este viaje
                                    </>
                                  )}
                                </Button>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* HISTORIAL DE VIAJES */}
        <Row className="mb-5">
          <Col md={12}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                <h4 className="fw-bold mb-3">
                  <i className="fas fa-history text-primary me-2"></i>Mi Historial de Viajes
                </h4>
                {!Array.isArray(trips) || trips.length === 0 ? (
                  <Alert variant="info" className="text-center">
                    <i className="fas fa-info-circle me-2"></i>
                    No tienes viajes aún.
                  </Alert>
                ) : (
                  <Table striped hover responsive className="align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Distancia</th>
                        <th>Estado</th>
                        <th>Tarifa</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((trip, index) => (
                        <tr key={trip.id}>
                          <td>{index + 1}</td>
                          <td>{trip.origen}</td>
                          <td>{trip.destino}</td>
                          <td>{trip.distancia_km ? `${trip.distancia_km} km` : 'N/A'}</td>
                          <td>
                            <Badge
                              bg={
                                trip.estado === 'pendiente'
                                  ? 'warning'
                                  : trip.estado === 'en_curso'
                                  ? 'info'
                                  : trip.estado === 'finalizado'
                                  ? 'success'
                                  : 'danger'
                              }
                              pill
                            >
                              {trip.estado}
                            </Badge>
                          </td>
                          <td>
                            {trip.estado === 'finalizado'
                              ? `$${trip.tarifa_final}`
                              : trip.tarifa_estimada
                              ? `$${trip.tarifa_estimada} (est.)`
                              : 'N/A'}
                          </td>
                          <td>
                            {trip.estado === 'en_curso' && Number(trip.conductor_id) === Number(user.id) && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="me-1"
                                  onClick={() => abrirModalFinalizar(trip.id)}
                                >
                                  <i className="fas fa-check-circle me-1"></i>Finalizar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => cancelarViaje(trip.id)}
                                >
                                  <i className="fas fa-times-circle me-1"></i>Cancelar
                                </Button>
                              </>
                            )}
                            {(trip.estado === 'pendiente' || trip.estado === 'en_curso') &&
                              Number(trip.pasajero_id) === Number(user.id) && (
                                <Button variant="danger" size="sm" onClick={() => cancelarViaje(trip.id)}>
                                  <i className="fas fa-times-circle me-1"></i>Cancelar
                                </Button>
                              )}
                            {trip.estado === 'pendiente' &&
                              Number(trip.conductor_id) === Number(user.id) &&
                              user.tipo_usuario === 'conductor' && (
                                <>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    className="me-1"
                                    disabled={tieneViajeActivo}
                                    onClick={() => aceptarViaje(trip.id)}
                                  >
                                    <i className="fas fa-check me-1"></i>Aceptar
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    disabled={tieneViajeActivo}
                                    onClick={() => rechazarViaje(trip.id)}
                                  >
                                    <i className="fas fa-times me-1"></i>Rechazar
                                  </Button>
                                </>
                              )}
                            {trip.estado === 'pendiente' &&
                              !trip.conductor_id &&
                              user.tipo_usuario === 'conductor' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={tieneViajeActivo}
                                  onClick={() => aceptarViaje(trip.id)}
                                >
                                  <i className="fas fa-check me-1"></i>Aceptar
                                </Button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ===== MODAL COMPRAR SUSCRIPCIÓN ===== */}
      <Modal
        show={showSubscriptionModal}
        onHide={() => {
          setShowSubscriptionModal(false);
          setSubscriptionMessage('');
          setCodigoConductor('');
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-warning">
          <Modal.Title>
            <i className="fas fa-id-card me-2"></i>
            {subscriptionStatus?.activa ? 'Mi Suscripción' : 'Comprar Suscripción'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {numeroTarjetaAdmin ? (
            <Alert variant="primary" className="mb-4">
              <div className="text-center">
                <i className="fas fa-credit-card fa-2x mb-2"></i>
                <h6 className="fw-bold mb-2">Transfiere a esta tarjeta:</h6>
                <div
                  style={{
                    fontSize: '1.3rem',
                    letterSpacing: '3px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    padding: '10px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '2px dashed #0d6efd',
                  }}
                >
                  {numeroTarjetaAdmin}
                </div>
                <small className="text-muted d-block mt-2">
                  <i className="fas fa-info-circle me-1"></i>
                  Transfiere el monto y recibirás un código de confirmación.
                </small>
              </div>
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-4">
              <i className="fas fa-exclamation-triangle me-2"></i>
              El administrador aún no ha configurado un número de tarjeta. Contacta al soporte.
            </Alert>
          )}

          {subscriptionStatus?.activa && (
            <Alert variant="success" className="mb-4">
              <i className="fas fa-check-circle me-2"></i>
              <strong>Tu suscripción está activa.</strong>
              <br />
              Vence el <strong>{new Date(subscriptionStatus.expira).toLocaleDateString('es-CU')}</strong>{' '}
              ({subscriptionStatus.diasRestantes} día(s) restantes)
            </Alert>
          )}

          {miSolicitud && miSolicitud.estado === 'pendiente' && (
            <Alert variant="info" className="mb-4">
              <i className="fas fa-hourglass-half me-2"></i>
              <strong>Tienes una solicitud pendiente.</strong> El administrador debe validar el pago.
              <br />
              <small>Enviaste el código: <code>{miSolicitud.codigo_conductor}</code></small>
            </Alert>
          )}

          {miSolicitud && miSolicitud.estado === 'rechazada' && (
            <Alert variant="danger" className="mb-4">
              <i className="fas fa-times-circle me-2"></i>
              <strong>Tu última solicitud fue rechazada.</strong>
              {miSolicitud.notas && <><br /><small>Motivo: {miSolicitud.notas}</small></>}
            </Alert>
          )}

          {miSolicitud && miSolicitud.estado === 'aprobada' && subscriptionStatus?.activa && (
            <Alert variant="success" className="mb-4">
              <i className="fas fa-check-circle me-2"></i>
              <strong>¡Tu última solicitud fue aprobada!</strong>
              <br />
              <small>Aprobada el{' '}
                {miSolicitud.aprobado_en
                  ? new Date(miSolicitud.aprobado_en).toLocaleDateString('es-CU')
                  : 'N/A'}
              </small>
            </Alert>
          )}

          {!subscriptionStatus?.activa
            && (!miSolicitud
                || miSolicitud.estado === 'rechazada'
                || miSolicitud.estado === 'aprobada') && (
            <>
              <div className="text-center mb-4">
                <i className="fas fa-money-bill-wave fa-3x text-success mb-3"></i>
                <h5 className="fw-bold">¿Cómo funciona?</h5>
                <ol className="text-start small text-muted">
                  <li>Realiza una transferencia a la tarjeta de arriba.</li>
                  <li>Al enviar el dinero, recibirás un <strong>código</strong> de confirmación.</li>
                  <li>El administrador recibe otro código al confirmar la recepción.</li>
                  <li>Ingresa tu código aquí abajo. Cuando el admin ingrese el suyo, se activará automáticamente.</li>
                </ol>
              </div>

              {subscriptionMessage && (
                <Alert variant={subscriptionMessage.includes('Solicitud') ? 'success' : 'danger'}>
                  {subscriptionMessage}
                </Alert>
              )}

              <Form onSubmit={enviarCodigoSuscripcion}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    <i className="fas fa-key me-2"></i>Ingresa tu código de transferencia *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={codigoConductor}
                    onChange={(e) => setCodigoConductor(e.target.value.toUpperCase())}
                    placeholder="Ej: ABC12-DEF34"
                    autoFocus
                    style={{ fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
                  />
                  <Form.Text className="text-muted">
                    Escribe el código exactamente como lo recibiste.
                  </Form.Text>
                </Form.Group>

                <Button
                  variant="warning"
                  type="submit"
                  className="w-100"
                  disabled={subscriptionLoading}
                >
                  {subscriptionLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>Enviar solicitud
                    </>
                  )}
                </Button>
              </Form>
            </>
          )}

          {subscriptionStatus?.activa && (
            <div className="text-center mt-3">
              <Button variant="outline-secondary" onClick={() => setShowSubscriptionModal(false)}>
                Cerrar
              </Button>
            </div>
          )}

          {miSolicitud && miSolicitud.estado === 'pendiente' && (
            <div className="text-center mt-3">
              <Button variant="outline-secondary" onClick={() => setShowSubscriptionModal(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL FINALIZAR VIAJE */}
      <Modal
        show={showCompleteModal}
        onHide={() => {
          setShowCompleteModal(false);
          setCompleteTarifa('');
          setCompleteMessage('');
        }}
        centered
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="fas fa-check-circle me-2"></i>Finalizar Viaje
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {completeMessage && (
            <Alert variant={completeMessage.includes('exitosamente') ? 'success' : 'danger'}>
              {completeMessage}
            </Alert>
          )}
          <p className="text-muted small mb-3">
            Ingresa la tarifa final cobrada al pasajero:
          </p>
          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-dollar-sign me-2"></i>Tarifa final *
            </Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={completeTarifa}
              onChange={(e) => setCompleteTarifa(e.target.value)}
              placeholder="Ej: 150.00"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmarFinalizarViaje();
                }
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCompleteModal(false);
              setCompleteTarifa('');
              setCompleteMessage('');
            }}
          >
            Cancelar
          </Button>
          <Button variant="success" onClick={confirmarFinalizarViaje}>
            <i className="fas fa-check me-2"></i>Confirmar Finalización
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL MAPA DE PATRULLAS */}
      <Modal
        show={showPatrolModal}
        onHide={() => setShowPatrolModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Mapa de Patrullas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <MapaPatrullas altura="500px" />
        </Modal.Body>
      </Modal>

      {/* MODAL DE EDICIÓN DE PERFIL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-user-edit me-2"></i>Editar Perfil
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {editMessage && (
            <Alert variant={editMessage.includes('correctamente') ? 'success' : 'danger'}>
              {editMessage}
            </Alert>
          )}
          <Form onSubmit={handleEditSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-user me-2"></i>Nombre Completo</Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre_completo"
                    value={editForm.nombre_completo}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-phone me-2"></i>Teléfono</Form.Label>
                  <Form.Control
                    type="text"
                    name="telefono"
                    value={editForm.telefono}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label><i className="fas fa-home me-2"></i>Dirección</Form.Label>
              <Form.Control
                type="text"
                name="direccion"
                value={editForm.direccion}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-map-marked-alt me-2"></i>Provincia</Form.Label>
                  <Form.Select
                    name="provincia"
                    value={editForm.provincia}
                    onChange={handleEditChange}
                  >
                    <option value="">Selecciona una provincia</option>
                    {cubaData.provincias.map((prov) => (
                      <option key={prov.nombre} value={prov.nombre}>{prov.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-city me-2"></i>Municipio</Form.Label>
                  <Form.Select
                    name="municipio"
                    value={editForm.municipio}
                    onChange={handleEditChange}
                    disabled={!editForm.provincia}
                  >
                    <option value="">Selecciona un municipio</option>
                    {municipios.map((mun) => (
                      <option key={mun} value={mun}>{mun}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Button variant="primary" type="submit" className="w-100">
              <i className="fas fa-save me-2"></i>Guardar Cambios
            </Button>
          </Form>

          {user.tipo_usuario === 'pasajero' && (
            <>
              <hr className="my-4" />
              <div className="text-center">
                <p className="text-muted small mb-2">¿Quieres empezar a ganar dinero con Cuba-TaX?</p>
                <Button
                  variant="outline-success"
                  onClick={() => setShowDriverModal(true)}
                  className="w-100"
                >
                  <i className="fas fa-car me-2"></i>Convertirme en Conductor
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL CONFIRMAR CONVERSIÓN A CONDUCTOR */}
      <Modal
        show={showDriverModal}
        onHide={() => {
          setShowDriverModal(false);
          setDriverMessage('');
        }}
        centered
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title><i className="fas fa-car me-2"></i>Convertirme en Conductor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          {driverMessage ? (
            <Alert variant={driverMessage.includes('Felicidades') ? 'success' : 'danger'}>
              {driverMessage}
            </Alert>
          ) : (
            <>
              <i className="fas fa-taxi fa-4x text-success mb-3"></i>
              <h5 className="fw-bold">¿Estás seguro?</h5>
              <p className="text-muted">Al convertirte en conductor podrás:</p>
              <ul className="list-unstyled text-start">
                <li><i className="fas fa-check text-success me-2"></i>Recibir solicitudes de viajes</li>
                <li><i className="fas fa-check text-success me-2"></i>Aceptar viajes cercanos</li>
                <li><i className="fas fa-check text-success me-2"></i>Ganar dinero por cada viaje</li>
              </ul>
              <p className="text-muted small mb-0">
                <i className="fas fa-info-circle me-1"></i>Esta acción no se puede deshacer.
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!driverMessage && (
            <>
              <Button variant="secondary" onClick={() => setShowDriverModal(false)} disabled={driverLoading}>
                Cancelar
              </Button>
              <Button variant="success" onClick={handleBecomeDriver} disabled={driverLoading}>
                {driverLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-2"></i>Sí, quiero ser conductor
                  </>
                )}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* MODAL MI VEHÍCULO */}
      <Modal
        show={showVehicleModal}
        onHide={() => {
          setShowVehicleModal(false);
          setVehicleMessage('');
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title><i className="fas fa-car me-2"></i>Mi Vehículo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {vehicleMessage && (
            <Alert variant={vehicleMessage.includes('correctamente') ? 'success' : 'danger'}>
              {vehicleMessage}
            </Alert>
          )}
          <Form onSubmit={handleVehicleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label><i className="fas fa-truck me-2"></i>Tipo de Vehículo *</Form.Label>
              <Form.Select
                name="tipo_vehiculo"
                value={vehicleForm.tipo_vehiculo}
                onChange={handleVehicleChange}
                required
              >
                <option value="">Selecciona un tipo</option>
                <option value="van">Van</option>
                <option value="guagua">Guagua</option>
                <option value="mini-van">Mini-Van</option>
                <option value="auto_ligero">Auto Ligero</option>
                <option value="moto">Moto</option>
                <option value="carro_electrico">Carro Eléctrico</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-users me-2"></i>Cantidad de Pasajeros *</Form.Label>
                  <Form.Control
                    type="number"
                    name="cantidad_pasajeros"
                    min="1"
                    max="50"
                    value={vehicleForm.cantidad_pasajeros}
                    onChange={handleVehicleChange}
                    placeholder="Ej: 4"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-dollar-sign me-2"></i>Tarifa por Km *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    name="tarifa_por_km"
                    value={vehicleForm.tarifa_por_km}
                    onChange={handleVehicleChange}
                    placeholder="Ej: 15.00"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="climatizado"
                checked={vehicleForm.climatizado}
                onChange={handleVehicleChange}
                label={<><i className="fas fa-snowflake me-2"></i>¿Tiene aire acondicionado (climatizado)?</>}
              />
            </Form.Group>
            <Button variant="success" type="submit" className="w-100" disabled={vehicleLoading}>
              {vehicleLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>Guardar Vehículo
                </>
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Layout>
  );
};

export default Dashboard;
