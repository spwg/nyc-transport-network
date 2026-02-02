import { useEffect, useState, useMemo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { Route, Station, RouteGeometry, SystemData } from '@/types/transit';

interface TransitDataState {
  routes: Route[];
  stations: Station[];
  routeGeometries: RouteGeometry[];
  loading: boolean;
  error: Error | null;
}

const dataCache = new Map<string, SystemData>();

async function loadSystemData(systemId: string): Promise<SystemData | null> {
  if (dataCache.has(systemId)) {
    return dataCache.get(systemId)!;
  }

  try {
    const response = await fetch(`/data/systems/${systemId}.json`);
    if (!response.ok) {
      console.warn(`Failed to load data for system: ${systemId}`);
      return null;
    }
    const data = await response.json() as SystemData;
    dataCache.set(systemId, data);
    return data;
  } catch (error) {
    console.error(`Error loading system ${systemId}:`, error);
    return null;
  }
}

export function useTransitData(): TransitDataState {
  const enabledSystems = useMapStore((state) => state.enabledSystems);
  const [loadedData, setLoadedData] = useState<Map<string, SystemData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const systemIds = Array.from(enabledSystems);
      const newSystems = systemIds.filter((id) => !loadedData.has(id));

      if (newSystems.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(newSystems.map(loadSystemData));

        if (cancelled) return;

        setLoadedData((prev) => {
          const next = new Map(prev);
          results.forEach((data, i) => {
            if (data) {
              next.set(newSystems[i], data);
            }
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load data'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [enabledSystems, loadedData]);

  const data = useMemo(() => {
    const routes: Route[] = [];
    const stations: Station[] = [];
    const routeGeometries: RouteGeometry[] = [];

    for (const systemId of enabledSystems) {
      const systemData = loadedData.get(systemId);
      if (systemData) {
        routes.push(...systemData.routes);
        stations.push(...systemData.stations);
        routeGeometries.push(...systemData.routeGeometries);
      }
    }

    return { routes, stations, routeGeometries };
  }, [enabledSystems, loadedData]);

  return {
    ...data,
    loading,
    error,
  };
}
