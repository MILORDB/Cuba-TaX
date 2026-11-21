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

const MapaUbicacion = ({ latitud, longitud, altura = '250px', etiqueta = 'Ubicación del pasajero' }) => {
  if (!latitud || !longitud) {
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
          fontSize: '0.9rem',
        }}
      >
        📍 Ubicación no disponible
      </div>
    );
  }

  const posicion = [parseFloat(latitud), parseFloat(longitud)];

  return (
    <div style={{ height: altura, borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={posicion}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={posicion}>
          <Popup>{etiqueta}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapaUbicacion;