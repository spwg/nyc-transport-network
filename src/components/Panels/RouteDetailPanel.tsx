import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useTransitData } from '@/hooks/useTransitData';
import { SUBWAY_LINE_COLORS, TRANSIT_SYSTEMS } from '@/constants/systems';

export function RouteDetailPanel() {
  const { selectedRoute, selectRoute, selectStation, zoomToRoute } = useMapStore();
  const { stations, routeGeometries } = useTransitData();
  const prevRouteIdRef = useRef<string | null>(null);

  const routeGeometry = selectedRoute
    ? routeGeometries.find((g) => g.routeId === selectedRoute.id)
    : null;

  // Auto-zoom when a new route is selected
  useEffect(() => {
    if (selectedRoute && routeGeometry && selectedRoute.id !== prevRouteIdRef.current) {
      zoomToRoute(routeGeometry.coordinates);
      prevRouteIdRef.current = selectedRoute.id;
    }
    if (!selectedRoute) {
      prevRouteIdRef.current = null;
    }
  }, [selectedRoute, routeGeometry, zoomToRoute]);

  if (!selectedRoute) return null;

  // Get stations for this route and sort by station order (if available)
  const routeStations = stations
    .filter((s) => s.routeIds.includes(selectedRoute.id))
    .sort((a, b) => {
      if (selectedRoute.stationOrder) {
        const orderA = selectedRoute.stationOrder.indexOf(a.id);
        const orderB = selectedRoute.stationOrder.indexOf(b.id);
        // If both are in the order list, sort by position
        if (orderA !== -1 && orderB !== -1) {
          return orderA - orderB;
        }
        // Put stations in order list before those not in it
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
      }
      // Fallback: sort alphabetically
      return a.name.localeCompare(b.name);
    });

  const system = TRANSIT_SYSTEMS.find((s) => s.id === selectedRoute.systemId);
  const bgColor = SUBWAY_LINE_COLORS[selectedRoute.shortName] || selectedRoute.color;

  // Use longName for rail systems (LIRR, Metro-North, NJ Transit), shortName for subway/PATH
  const useFullName = selectedRoute.type === 'rail' && selectedRoute.systemId !== 'path';
  const displayName = useFullName ? (selectedRoute.longName || selectedRoute.shortName) : selectedRoute.shortName;

  const handleZoomToRoute = () => {
    if (routeGeometry) {
      zoomToRoute(routeGeometry.coordinates);
    }
  };

  const handleStationClick = (station: typeof routeStations[0]) => {
    selectStation(station);
  };

  return (
    <aside className="route-panel">
      <header>
        <div className="route-header-info">
          <span
            className={`route-badge-large ${useFullName ? 'route-badge-wide' : ''}`}
            style={{
              backgroundColor: bgColor,
              color: selectedRoute.textColor || '#fff',
            }}
          >
            {displayName}
          </span>
          {!useFullName && <h2>{selectedRoute.longName}</h2>}
        </div>
        <button
          className="close-button"
          onClick={() => selectRoute(null)}
          aria-label="Close panel"
        >
          &times;
        </button>
      </header>

      <section className="route-info">
        <p>
          <strong>System:</strong> {system?.name || selectedRoute.systemId}
        </p>
        <p>
          <strong>Type:</strong>{' '}
          {selectedRoute.type.charAt(0).toUpperCase() + selectedRoute.type.slice(1)}
        </p>
      </section>

      <section className="route-stations">
        <h3>Stations ({routeStations.length})</h3>
        <ul>
          {routeStations.map((station) => (
            <li
              key={station.id}
              onClick={() => handleStationClick(station)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleStationClick(station);
                }
              }}
            >
              <span className="station-name">{station.name}</span>
              {station.isTransferPoint && (
                <span className="transfer-indicator" title="Transfer station">
                  &#x21C4;
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {routeGeometry && (
        <button className="zoom-button" onClick={handleZoomToRoute}>
          Zoom to Route
        </button>
      )}
    </aside>
  );
}
