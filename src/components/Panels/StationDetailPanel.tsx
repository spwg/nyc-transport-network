import { useMapStore } from '@/stores/mapStore';
import { useTransitData } from '@/hooks/useTransitData';
import { SUBWAY_LINE_COLORS } from '@/constants/systems';

export function StationDetailPanel() {
  const { selectedStation, selectStation, selectRoute } = useMapStore();
  const { routes } = useTransitData();

  if (!selectedStation) return null;

  const servingRoutes = routes.filter((r) =>
    selectedStation.routeIds.includes(r.id)
  );

  return (
    <aside className="station-panel">
      <header>
        <h2>{selectedStation.name}</h2>
        <button
          className="close-button"
          onClick={() => selectStation(null)}
          aria-label="Close panel"
        >
          &times;
        </button>
      </header>

      <section>
        <h3>Routes</h3>
        <div className="route-badges">
          {servingRoutes.map((route) => {
            const bgColor = SUBWAY_LINE_COLORS[route.shortName] || route.color;
            // Use longName for rail systems (LIRR, Metro-North, NJ Transit), shortName for subway/PATH
            const useFullName = route.type === 'rail' && route.systemId !== 'path';
            const displayName = useFullName ? (route.longName || route.shortName) : route.shortName;
            return (
              <button
                key={route.id}
                className={`route-badge route-badge-clickable ${useFullName ? 'route-badge-wide' : ''}`}
                style={{
                  backgroundColor: bgColor,
                  color: route.textColor || '#fff',
                }}
                onClick={() => selectRoute(route)}
                title={`View ${route.longName}`}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      </section>

      {(selectedStation.dailyRidership || servingRoutes.some(r => r.peakHeadwayMinutes)) && (
        <section>
          <h3>Service Data</h3>
          <ul className="data-list">
            {selectedStation.dailyRidership && (
              <li>
                Daily Ridership:{' '}
                <strong>~{selectedStation.dailyRidership.toLocaleString()}</strong>
              </li>
            )}
            {(() => {
              const peakRoutes = servingRoutes.filter(r => r.peakHeadwayMinutes && r.peakHeadwayMinutes > 0);
              if (peakRoutes.length === 0) return null;
              const bestHeadway = Math.min(...peakRoutes.map(r => r.peakHeadwayMinutes!));
              return (
                <li>
                  Peak Service: <strong>Every {bestHeadway} min</strong>
                </li>
              );
            })()}
          </ul>
        </section>
      )}

      {selectedStation.isTransferPoint && (
        <section>
          <h3>Transfer Station</h3>
          <p className="transfer-info">
            This station connects to other transit lines.
          </p>
        </section>
      )}

      {selectedStation.accessibility && (
        <section>
          <h3>Accessibility</h3>
          <ul className="accessibility-list">
            <li>
              ADA Accessible:{' '}
              <strong>{selectedStation.accessibility.ada ? 'Yes' : 'No'}</strong>
            </li>
            <li>
              Elevator:{' '}
              <strong>
                {selectedStation.accessibility.elevator ? 'Yes' : 'No'}
              </strong>
            </li>
          </ul>
        </section>
      )}

      <section className="station-coords">
        <small>
          {selectedStation.latitude.toFixed(6)},{' '}
          {selectedStation.longitude.toFixed(6)}
        </small>
      </section>
    </aside>
  );
}
