import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Arreglo para el ícono por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Íconos personalizados (verde = origen, rojo = destino)
const iconoOrigen = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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

// Componente interno que dibuja la ruta
const RoutingControl = ({ origen, destino, onRutaCalculada }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!origen || !destino || !map) return;

    // Si ya existe un control, eliminarlo antes de crear uno nuevo
    if (routingControlRef.current) {
      try {
        if (routingControlRef.current._pendingRequest) {
          routingControlRef.current._pendingRequest.abort();
          routingControlRef.current._pendingRequest = null;
        }
        map.removeControl(routingControlRef.current);
      } catch (e) {
        console.warn('Error al limpiar control anterior:', e);
      }
      routingControlRef.current = null;
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(origen.lat, origen.lng),
        L.latLng(destino.lat, destino.lng),
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1',
        profile: 'driving',
      }),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#0d6efd', weight: 6, opacity: 0.8 }],
      },
      createMarker: () => null,
      show: false,
    });

    routingControl.on('routesfound', (e) => {
      if (!montadoRef.current) return;
      
      const routes = e.routes;
      const summary = routes[0].summary;
      const distanciaKm = (summary.totalDistance / 1000).toFixed(1);
      const tiempoMin = Math.round(summary.totalTime / 60);

      if (onRutaCalculada) {
        onRutaCalculada({ distancia: distanciaKm, tiempo: tiempoMin });
      }
    });

    routingControl.addTo(map);
    routingControlRef.current = routingControl;

    return () => {
      if (routingControlRef.current) {
        try {
          if (routingControlRef.current._pendingRequest) {
            routingControlRef.current._pendingRequest.abort();
            routingControlRef.current._pendingRequest = null;
          }
          if (map && map._container) {
            map.removeControl(routingControlRef.current);
          }
        } catch (e) {
          console.warn('Error al eliminar control de ruteo:', e);
        }
        routingControlRef.current = null;
      }
    };
  }, [map, origen, destino, onRutaCalculada]);

  return null;
};

const MapaRuta = ({
  origenLat,
  origenLng,
  destinoLat,
  destinoLng,
  altura = '300px',
  etiquetaOrigen = 'Recoger pasajero',
  etiquetaDestino = 'Destino',
}) => {
  if (!origenLat || !origenLng) {
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
        📍 Ubicación del origen no disponible
      </div>
    );
  }

  const origen = { lat: parseFloat(origenLat), lng: parseFloat(origenLng) };
  const destino =
    destinoLat && destinoLng
      ? { lat: parseFloat(destinoLat), lng: parseFloat(destinoLng) }
      : null;

  return (
    <div style={{ height: altura, borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={[origen.lat, origen.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[origen.lat, origen.lng]} icon={iconoOrigen}>
          <Popup>{etiquetaOrigen}</Popup>
        </Marker>

        {destino && (
          <Marker position={[destino.lat, destino.lng]} icon={iconoDestino}>
            <Popup>{etiquetaDestino}</Popup>
          </Marker>
        )}

        {destino && <RoutingControl origen={origen} destino={destino} />}
      </MapContainer>
    </div>
  );
};

// 🔑 Memorizar el componente para evitar re-renders innecesarios
export default React.memo(MapaRuta);