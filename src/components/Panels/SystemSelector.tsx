import { useMapStore } from '@/stores/mapStore';
import { TRANSIT_SYSTEMS } from '@/constants/systems';

export function SystemSelector() {
  const { enabledSystems, toggleSystem } = useMapStore();

  return (
    <div className="system-selector">
      <h3>Transit Systems</h3>
      <div className="system-list">
        {TRANSIT_SYSTEMS.map((system) => (
          <label key={system.id} className="system-toggle">
            <input
              type="checkbox"
              checked={enabledSystems.has(system.id)}
              onChange={() => toggleSystem(system.id)}
            />
            <span
              className="system-indicator"
              style={{ backgroundColor: system.color }}
            />
            <span className="system-name">{system.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
