import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Arreglo para el ícono por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Íconos personalizados
const iconoConductor = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoPasajero = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoDestino = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapaVehiculosActivos = ({ vehiculos, altura = '600px', centroInicial = [23.1136, -82.3666] }) => {
  if (!vehiculos || vehiculos.length === 0) {
    return (
      <div
        style={{
          height: altura,
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          color: '#888',
          fontSize: '1rem',
        }}
      >
        🚗 No hay vehículos activos en este momento
      </div>
    );
  }

  // Tomar el primer vehículo con ubicación como centro
  const primerVehiculo = vehiculos.find(v => v.conductor_latitud && v.conductor_longitud);
  const centro = primerVehiculo
    ? [parseFloat(primerVehiculo.conductor_latitud), parseFloat(primerVehiculo.conductor_longitud)]
    : centroInicial;

  return (
    <div style={{ height: altura, borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={centro}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehiculos.map((v) => (
          <React.Fragment key={v.trip_id}>
            {/* Marcador del conductor */}
            {v.conductor_latitud && v.conductor_longitud && (
              <Marker
                position={[parseFloat(v.conductor_latitud), parseFloat(v.conductor_longitud)]}
                icon={iconoConductor}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <h6 className="fw-bold mb-1">
                      🚗 {v.conductor?.nombre_completo || 'Conductor'}
                    </h6>
                    <p className="mb-1 small">
                      <strong>Vehículo:</strong> {v.conductor?.tipo_vehiculo?.replace('_', ' ')}
                    </p>
                    <p className="mb-1 small">
                      <strong>Teléfono:</strong> {v.conductor?.telefono || 'N/A'}
                    </p>
                    <hr className="my-2" />
                    <p className="mb-1 small">
                      <strong>📍 De:</strong> {v.origen}
                    </p>
                    <p className="mb-1 small">
                      <strong>🎯 A:</strong> {v.destino}
                    </p>
                    <p className="mb-1 small">
                      <strong>Pasajero:</strong> {v.pasajero?.nombre_completo || 'N/A'}
                    </p>
                    <p className="mb-0 small">
                      <strong>Última actualización:</strong>{' '}
                      {v.conductor_ultima_actualizacion
                        ? new Date(v.conductor_ultima_actualizacion).toLocaleTimeString('es-CU')
                        : 'N/A'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcador del pasajero (punto de origen) */}
            {v.latitud_origen && v.longitud_origen && (
              <Marker
                position={[parseFloat(v.latitud_origen), parseFloat(v.longitud_origen)]}
                icon={iconoPasajero}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <h6 className="fw-bold mb-1">👤 Pasajero</h6>
                    <p className="mb-0 small">{v.pasajero?.nombre_completo || 'N/A'}</p>
                    <p className="mb-0 small">📍 {v.origen}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcador del destino */}
            {v.latitud_destino && v.longitud_destino && (
              <Marker
                position={[parseFloat(v.latitud_destino), parseFloat(v.longitud_destino)]}
                icon={iconoDestino}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <h6 className="fw-bold mb-1">🎯 Destino</h6>
                    <p className="mb-0 small">{v.destino}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapaVehiculosActivos;