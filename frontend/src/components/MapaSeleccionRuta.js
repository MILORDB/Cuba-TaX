import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Arreglo para el ícono por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Íconos personalizados
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

// Componente interno para manejar clics en el mapa
const ClickHandler = ({ onMapClick, seleccionando }) => {
  useMapEvents({
    click(e) {
      if (seleccionando) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

// Componente interno para el control de ruteo
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
        styles: [{ color: '#0d6efd', weight: 5 }],
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

const MapaSeleccionRuta = ({
  origen,
  destino,
  onOrigenChange,
  onDestinoChange,
  onRutaCalculada,
  altura = '400px',
}) => {
  const [mapaListo, setMapaListo] = useState(false);
  const [centroInicial, setCentroInicial] = useState([23.1136, -82.3666]);
  const [paso, setPaso] = useState('origen');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCentroInicial([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {}
      );
    }
    setMapaListo(true);
  }, []);

  const handleMapClick = useCallback((latlng) => {
    if (paso === 'origen') {
      onOrigenChange({ lat: latlng.lat, lng: latlng.lng });
      setPaso('destino');
    } else {
      onDestinoChange({ lat: latlng.lat, lng: latlng.lng });
      setPaso('origen');
    }
  }, [paso, onOrigenChange, onDestinoChange]);

  const limpiar = () => {
    onOrigenChange(null);
    onDestinoChange(null);
    setPaso('origen');
    if (onRutaCalculada) onRutaCalculada(null);
  };

  if (!mapaListo) {
    return <div style={{ height: altura, background: '#f0f0f0' }}>Cargando mapa...</div>;
  }

  return (
    <div>
      <div className="mb-2 d-flex gap-2 flex-wrap">
        <span className={`badge ${paso === 'origen' ? 'bg-primary' : 'bg-secondary'}`}>
          <i className="fas fa-map-marker-alt me-1"></i> Clic para marcar {paso === 'origen' ? 'ORIGEN' : 'DESTINO'}
        </span>
        {origen && (
          <span className="badge bg-success">
            <i className="fas fa-check me-1"></i> Origen marcado
          </span>
        )}
        {destino && (
          <span className="badge bg-success">
            <i className="fas fa-check me-1"></i> Destino marcado
          </span>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={limpiar}
        >
          <i className="fas fa-redo me-1"></i> Limpiar
        </button>
      </div>

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
          <ClickHandler onMapClick={handleMapClick} seleccionando={true} />

          {origen && (
            <Marker position={[origen.lat, origen.lng]} icon={iconoOrigen}>
              <Popup>Origen</Popup>
            </Marker>
          )}
          {destino && (
            <Marker position={[destino.lat, destino.lng]} icon={iconoDestino}>
              <Popup>Destino</Popup>
            </Marker>
          )}

          <RoutingControl
            origen={origen}
            destino={destino}
            onRutaCalculada={onRutaCalculada}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapaSeleccionRuta;