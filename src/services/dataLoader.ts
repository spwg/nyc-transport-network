import type { SystemData } from '@/types/transit';

const cache = new Map<string, SystemData>();

export async function fetchSystemData(systemId: string): Promise<SystemData> {
  if (cache.has(systemId)) {
    return cache.get(systemId)!;
  }

  const response = await fetch(`/data/systems/${systemId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data for system: ${systemId}`);
  }

  const data = await response.json() as SystemData;
  cache.set(systemId, data);
  return data;
}

export function clearCache(): void {
  cache.clear();
}

export function getCachedSystems(): string[] {
  return Array.from(cache.keys());
}
