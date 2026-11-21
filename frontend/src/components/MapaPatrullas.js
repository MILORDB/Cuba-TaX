import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Button, Badge, Alert, Spinner } from 'react-bootstrap';
import L from 'leaflet';
import axios from 'axios';

// Arreglo para íconos
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const iconoPatrulla = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -34],
  shadowSize: [49, 49],
});

const iconoMiUbicacion = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    },
  });
  return null;
};

const MapaPatrullas = ({ altura = '500px' }) => {
  const [patrullas, setPatrullas] = useState([]);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [reportando, setReportando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [zona, setZona] = useState('');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(null);

  const obtenerMiUbicacion = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMiUbicacion(coords);
          resolve(coords);
        },
        (err) => {
          console.warn('Error al obtener ubicación:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const cargarPatrullas = useCallback(async () => {
    try {
      const response = await axios.get('/api/patrols/active');
      setPatrullas(response.data.patrullas || []);
      setZona(response.data.zona || '');
    } catch (error) {
      console.error('Error al cargar patrullas:', error);
      if (error.response?.status === 403) {
        setMensaje(error.response?.data?.message || 'No tienes acceso a las patrullas.');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerMiUbicacion();
    cargarPatrullas();

    const interval = setInterval(cargarPatrullas, 30000);
    return () => clearInterval(interval);
  }, [cargarPatrullas]);

  const reportarAqui = async () => {
    setMensaje('');
    let coords = miUbicacion;
    if (!coords) {
      coords = await obtenerMiUbicacion();
    }
    if (!coords) {
      setMensaje('No se pudo obtener tu ubicación. Activa el GPS.');
      return;
    }
    await reportarEn(coords.lat, coords.lng);
  };

  const reportarEn = async (lat, lng) => {
    setReportando(true);
    setMensaje('');
    try {
      const response = await axios.post('/api/patrols', {
        latitud: lat,
        longitud: lng,
      });
      setMensaje(response.data.message);
      setUbicacionSeleccionada(null);
      await cargarPatrullas();
      setTimeout(() => setMensaje(''), 4000);
    } catch (error) {
      setMensaje(error.response?.data?.message || 'Error al reportar');
    } finally {
      setReportando(false);
    }
  };

  const handleMapClick = (latlng) => {
    setUbicacionSeleccionada({ lat: latlng.lat, lng: latlng.lng });
  };

  const centroInicial = miUbicacion
    ? [miUbicacion.lat, miUbicacion.lng]
    : [23.1136, -82.3666];

  return (
    <div>
      {mensaje && (
        <Alert variant={mensaje.includes('reportada') ? 'success' : 'danger'} className="py-2 small">
          {mensaje}
        </Alert>
      )}

      <div className="d-flex gap-2 flex-wrap mb-3">
        <Button
          variant="danger"
          onClick={reportarAqui}
          disabled={reportando}
        >
          {reportando ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Reportando...
            </>
          ) : (
            <>
              <i className="fas fa-exclamation-triangle me-2"></i>
              Reportar patrulla aquí
            </>
          )}
        </Button>

        <Badge bg="danger" className="d-flex align-items-center px-3">
          <i className="fas fa-car me-2"></i>
          {patrullas.length} patrulla(s) activa(s)
        </Badge>

        {zona && (
          <Badge bg="info" className="d-flex align-items-center px-3">
            <i className="fas fa-map-marker-alt me-2"></i>
            {zona}
          </Badge>
        )}

        <Badge bg="secondary" className="d-flex align-items-center px-3">
          <i className="fas fa-sync-alt me-2"></i>
          Actualiza cada 30 seg
        </Badge>

        <Button variant="outline-secondary" size="sm" onClick={cargarPatrullas}>
          <i className="fas fa-sync-alt me-1"></i>Refrescar
        </Button>
      </div>

      <Alert variant="info" className="py-2 small mb-3">
        <i className="fas fa-info-circle me-2"></i>
        Solo verás patrullas reportadas en <strong>tu municipio y provincia</strong>. Cada reporte dura <strong>1 hora</strong>.
      </Alert>

      <div style={{ height: altura, borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer
          center={centroInicial}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onMapClick={handleMapClick} />

          {miUbicacion && (
            <Marker position={[miUbicacion.lat, miUbicacion.lng]} icon={iconoMiUbicacion}>
              <Popup>📍 Mi ubicación actual</Popup>
            </Marker>
          )}

          {ubicacionSeleccionada && (
            <Marker
              position={[ubicacionSeleccionada.lat, ubicacionSeleccionada.lng]}
              icon={iconoPatrulla}
            >
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>¿Reportar patrulla aquí?</strong>
                  <br />
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-2 w-100"
                    onClick={() =>
                      reportarEn(ubicacionSeleccionada.lat, ubicacionSeleccionada.lng)
                    }
                  >
                    <i className="fas fa-check me-1"></i>Sí, reportar
                  </Button>
                </div>
              </Popup>
            </Marker>
          )}

          {patrullas.map((p) => (
            <Marker
              key={p.id}
              position={[parseFloat(p.latitud), parseFloat(p.longitud)]}
              icon={iconoPatrulla}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h6 className="fw-bold text-danger mb-2">
                    🚨 Patrulla reportada
                  </h6>
                  <p className="mb-1 small">
                    <strong>Por:</strong> {p.conductor?.nombre_completo || 'Anónimo'}
                  </p>
                  <p className="mb-1 small">
                    <strong>Zona:</strong> {p.municipio}, {p.provincia}
                  </p>
                  <p className="mb-1 small">
                    <strong>Hace:</strong>{' '}
                    {Math.round((Date.now() - new Date(p.createdAt).getTime()) / 60000)} min
                  </p>
                  <p className="mb-2 small">
                    <strong>Expira:</strong>{' '}
                    {new Date(p.expiresAt).toLocaleTimeString('es-CU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {cargando && (
        <div className="text-center mt-2">
          <Spinner animation="border" size="sm" />
          <small className="text-muted ms-2">Cargando patrullas...</small>
        </div>
      )}
    </div>
  );
};

export default MapaPatrullas;