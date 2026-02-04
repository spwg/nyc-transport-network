import { useMapStore } from '@/stores/mapStore';
import { TRANSIT_SYSTEMS } from '@/constants/systems';

const HEATMAP_COLORS = [
  { color: '#FFFFB2', label: 'Low' },
  { color: '#FEB24C', label: '' },
  { color: '#FD8D3C', label: '' },
  { color: '#F03B20', label: '' },
  { color: '#BD0026', label: 'High' },
];

export function Legend() {
  const { enabledSystems, showLegend, toggleLegend, showHeatmap, heatmapMetric } = useMapStore();

  const activeSystems = TRANSIT_SYSTEMS.filter((s) => enabledSystems.has(s.id));

  return (
    <div className="legend">
      <button className="legend-toggle" onClick={toggleLegend} aria-label="Toggle legend">
        {showLegend ? 'Legend \u25BC' : 'Legend \u25B2'}
      </button>
      {showLegend && (
        <div className="legend-content">
          <div className="legend-section">
            <h4>Transit Systems</h4>
            {activeSystems.map((system) => (
              <div key={system.id} className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: system.color }}
                />
                <span className="legend-label">{system.name}</span>
              </div>
            ))}
            {activeSystems.length === 0 && (
              <span className="legend-empty">No systems enabled</span>
            )}
          </div>
          {showHeatmap && (
            <div className="legend-section">
              <h4>{heatmapMetric === 'ridership' ? 'Daily Ridership' : 'Service Frequency'}</h4>
              <div className="legend-gradient">
                {HEATMAP_COLORS.map((c, i) => (
                  <div
                    key={i}
                    className="legend-gradient-stop"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
              <div className="legend-gradient-labels">
                <span>{heatmapMetric === 'ridership' ? 'Fewer riders' : 'Less frequent'}</span>
                <span>{heatmapMetric === 'ridership' ? 'More riders' : 'More frequent'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
