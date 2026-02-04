import { create } from 'zustand';
import type { Station, Route } from '@/types/transit';
import { INITIAL_VIEW_STATE } from '@/constants/systems';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface MapState {
  viewState: ViewState;
  setViewState: (vs: ViewState) => void;

  selectedStation: Station | null;
  selectStation: (station: Station | null) => void;

  selectedRoute: Route | null;
  selectRoute: (route: Route | null) => void;

  hoveredStationId: string | null;
  setHoveredStation: (id: string | null) => void;

  hoveredRouteId: string | null;
  setHoveredRoute: (id: string | null) => void;

  enabledSystems: Set<string>;
  toggleSystem: (systemId: string) => void;
  setEnabledSystems: (systemIds: string[]) => void;

  showTransfers: boolean;
  toggleTransfers: () => void;

  showLegend: boolean;
  toggleLegend: () => void;

  showHeatmap: boolean;
  toggleHeatmap: () => void;
  heatmapMetric: 'ridership' | 'frequency';
  setHeatmapMetric: (metric: 'ridership' | 'frequency') => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (opacity: number) => void;

  zoomToRoute: (coordinates: [number, number][]) => void;
  zoomToStation: (station: Station) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewState: INITIAL_VIEW_STATE,
  setViewState: (viewState) => set({ viewState }),

  selectedStation: null,
  selectStation: (station) =>
    set((state) => ({
      selectedStation: station,
      selectedRoute: null,
      viewState: station
        ? {
            ...state.viewState,
            longitude: station.longitude,
            latitude: station.latitude,
            zoom: Math.max(state.viewState.zoom, 14),
            pitch: 0,
            bearing: 0,
          }
        : state.viewState,
    })),

  selectedRoute: null,
  selectRoute: (route) => set({ selectedRoute: route, selectedStation: null }),

  hoveredStationId: null,
  setHoveredStation: (id) => set({ hoveredStationId: id }),

  hoveredRouteId: null,
  setHoveredRoute: (id) => set({ hoveredRouteId: id }),

  enabledSystems: new Set(['subway']),
  toggleSystem: (systemId) =>
    set((state) => {
      const newSystems = new Set(state.enabledSystems);
      if (newSystems.has(systemId)) {
        newSystems.delete(systemId);
      } else {
        newSystems.add(systemId);
      }
      return { enabledSystems: newSystems };
    }),
  setEnabledSystems: (systemIds) => set({ enabledSystems: new Set(systemIds) }),

  showTransfers: true,
  toggleTransfers: () => set((state) => ({ showTransfers: !state.showTransfers })),

  showLegend: true,
  toggleLegend: () => set((state) => ({ showLegend: !state.showLegend })),

  showHeatmap: false,
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  heatmapMetric: 'ridership',
  setHeatmapMetric: (metric) => set({ heatmapMetric: metric }),
  heatmapOpacity: 0.6,
  setHeatmapOpacity: (opacity) => set({ heatmapOpacity: Math.max(0, Math.min(1, opacity)) }),

  zoomToRoute: (coordinates) =>
    set((state) => {
      if (coordinates.length === 0) return state;

      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      const bounds = {
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
      };

      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const maxDiff = Math.max(bounds.maxLng - bounds.minLng, bounds.maxLat - bounds.minLat);
      const zoom = Math.max(9, Math.min(14, 12 - Math.log2(maxDiff * 50)));

      return {
        viewState: {
          ...state.viewState,
          longitude: centerLng,
          latitude: centerLat,
          zoom,
          pitch: 0,
          bearing: 0,
        },
      };
    }),

  zoomToStation: (station) =>
    set((state) => ({
      viewState: {
        ...state.viewState,
        longitude: station.longitude,
        latitude: station.latitude,
        zoom: 15,
        pitch: 0,
        bearing: 0,
      },
    })),
}));
