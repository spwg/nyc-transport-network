import { useMapStore } from '@/stores/mapStore';

export function HeatmapControls() {
  const {
    showHeatmap,
    toggleHeatmap,
    heatmapMetric,
    setHeatmapMetric,
    heatmapOpacity,
    setHeatmapOpacity,
  } = useMapStore();

  return (
    <div className="heatmap-controls">
      <h3>Data Overlay</h3>
      <label className="heatmap-toggle">
        <input type="checkbox" checked={showHeatmap} onChange={toggleHeatmap} />
        <span>Show Heat Map</span>
      </label>
      {showHeatmap && (
        <div className="heatmap-options">
          <div className="heatmap-metric">
            <label>
              <input
                type="radio"
                name="heatmap-metric"
                value="ridership"
                checked={heatmapMetric === 'ridership'}
                onChange={() => setHeatmapMetric('ridership')}
              />
              <span>Ridership</span>
            </label>
            <label>
              <input
                type="radio"
                name="heatmap-metric"
                value="frequency"
                checked={heatmapMetric === 'frequency'}
                onChange={() => setHeatmapMetric('frequency')}
              />
              <span>Service Frequency</span>
            </label>
          </div>
          <div className="heatmap-opacity">
            <label>
              Opacity
              <input
                type="range"
                min="30"
                max="100"
                value={Math.round(heatmapOpacity * 100)}
                onChange={(e) => setHeatmapOpacity(parseInt(e.target.value, 10) / 100)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
