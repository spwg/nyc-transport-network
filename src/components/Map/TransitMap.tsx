import { useCallback, useMemo } from 'react';
import { Map as MapGL } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMapStore } from '@/stores/mapStore';
import { useTransitData } from '@/hooks/useTransitData';
import { MAP_STYLE, SUBWAY_LINE_COLORS } from '@/constants/systems';
import type { Station, RouteGeometry } from '@/types/transit';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [100, 100, 100];
}

// Simple hash function to get consistent offset for each route
function hashRouteId(routeId: string): number {
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    const char = routeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export function TransitMap() {
  const {
    viewState,
    setViewState,
    selectStation,
    hoveredStationId,
    setHoveredStation,
    selectedRoute,
    hoveredRouteId,
    setHoveredRoute,
  } = useMapStore();
  const { routes, stations, routeGeometries, loading } = useTransitData();

  const selectedRouteId = selectedRoute?.id ?? null;

  const routeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((route) => {
      const color = SUBWAY_LINE_COLORS[route.shortName] || route.color || '#888888';
      map.set(route.id, color);
    });
    return map;
  }, [routes]);

  const handleRouteClick = useCallback(
    (info: PickingInfo<RouteGeometry>) => {
      if (info.object) {
        const route = routes.find((r) => r.id === info.object?.routeId);
        if (route) {
          useMapStore.getState().selectRoute(route);
        }
      }
    },
    [routes]
  );

  const handleStationClick = useCallback(
    (info: PickingInfo<Station>) => {
      if (info.object) {
        selectStation(info.object);
      }
    },
    [selectStation]
  );

  const handleStationHover = useCallback(
    (info: PickingInfo<Station>) => {
      setHoveredStation(info.object?.id ?? null);
    },
    [setHoveredStation]
  );

  const handleRouteHover = useCallback(
    (info: PickingInfo<RouteGeometry>) => {
      setHoveredRoute(info.object?.routeId ?? null);
    },
    [setHoveredRoute]
  );

  const layers = useMemo(() => {
    if (loading || routeGeometries.length === 0) {
      return [];
    }

    // Sort routes so they render in consistent order (by hash)
    const sortedRouteGeometries = [...routeGeometries].sort(
      (a, b) => hashRouteId(a.routeId) - hashRouteId(b.routeId)
    );

    return [
      // Hit area layer - wide invisible layer for better click/hover detection at all zoom levels
      new PathLayer<RouteGeometry>({
        id: 'routes-hitarea',
        data: sortedRouteGeometries,
        getPath: (d) => d.coordinates,
        getColor: [0, 0, 0, 0],  // Fully transparent
        getWidth: 20,            // Wide hit area
        widthMinPixels: 15,      // Always at least 15px for picking
        pickable: true,
        onClick: handleRouteClick,
        onHover: handleRouteHover,
        capRounded: true,
        jointRounded: true,
      }),
      // Outline layer - darker, wider lines behind the main routes
      new PathLayer<RouteGeometry>({
        id: 'routes-outline',
        data: sortedRouteGeometries,
        getPath: (d) => d.coordinates,
        getColor: (d) => {
          if (selectedRouteId && d.routeId !== selectedRouteId) {
            return [180, 180, 180, 60] as [number, number, number, number];
          }
          return [40, 40, 40, 200] as [number, number, number, number];
        },
        getWidth: (d) => {
          if (selectedRouteId === d.routeId) return 11;
          if (hoveredRouteId === d.routeId) return 9;
          return 6;
        },
        widthMinPixels: 3,
        widthMaxPixels: 15,
        pickable: false,
        capRounded: true,
        jointRounded: true,
        updateTriggers: {
          getColor: [selectedRouteId],
          getWidth: [selectedRouteId, hoveredRouteId],
        },
      }),
      // Main route layer with colors
      new PathLayer<RouteGeometry>({
        id: 'routes',
        data: sortedRouteGeometries,
        getPath: (d) => d.coordinates,
        getColor: (d) => {
          const baseColor = hexToRgb(routeColorMap.get(d.routeId) || '#888888');
          // Gray out non-selected routes when a route is selected
          if (selectedRouteId && d.routeId !== selectedRouteId) {
            return [200, 200, 200, 80] as [number, number, number, number];
          }
          // Dim non-hovered routes when hovering (only if no route selected)
          if (hoveredRouteId && d.routeId !== hoveredRouteId && !selectedRouteId) {
            return [baseColor[0], baseColor[1], baseColor[2], 100] as [number, number, number, number];
          }
          return baseColor;
        },
        getWidth: (d) => {
          if (selectedRouteId === d.routeId) return 8;
          if (hoveredRouteId === d.routeId) return 6;
          return 4;
        },
        widthMinPixels: 2,
        widthMaxPixels: 12,
        pickable: false,  // Hit area layer handles picking
        capRounded: true,
        jointRounded: true,
        updateTriggers: {
          getColor: [selectedRouteId, hoveredRouteId],
          getWidth: [selectedRouteId, hoveredRouteId],
        },
      }),
      new ScatterplotLayer<Station>({
        id: 'stations',
        data: stations,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => {
          // Make stations on selected route larger
          if (selectedRouteId && d.routeIds.includes(selectedRouteId)) {
            return d.isTransferPoint ? 100 : 70;
          }
          return d.isTransferPoint ? 80 : 50;
        },
        getFillColor: (d) => {
          // Gray out stations not on selected route
          if (selectedRouteId && !d.routeIds.includes(selectedRouteId)) {
            return [200, 200, 200, 100] as [number, number, number, number];
          }
          if (d.id === hoveredStationId) {
            return [255, 255, 255, 255];
          }
          return [255, 255, 255, 230];
        },
        getLineColor: (d) => {
          // Gray out border for stations not on selected route
          if (selectedRouteId && !d.routeIds.includes(selectedRouteId)) {
            return [180, 180, 180] as [number, number, number];
          }
          const routeId = d.routeIds[0];
          const route = routes.find((r) => r.id === routeId);
          const color = route ? SUBWAY_LINE_COLORS[route.shortName] || route.color : '#888888';
          return hexToRgb(color);
        },
        lineWidthMinPixels: 2,
        stroked: true,
        filled: true,
        radiusMinPixels: 4,
        radiusMaxPixels: 15,
        pickable: true,
        onClick: handleStationClick,
        onHover: handleStationHover,
        updateTriggers: {
          getFillColor: [hoveredStationId, selectedRouteId],
          getLineColor: [selectedRouteId],
          getRadius: [selectedRouteId],
        },
      }),
    ];
  }, [
    loading,
    routeGeometries,
    stations,
    routes,
    routeColorMap,
    hoveredStationId,
    selectedRouteId,
    hoveredRouteId,
    handleRouteClick,
    handleRouteHover,
    handleStationClick,
    handleStationHover,
  ]);

  const getTooltip = useCallback(
    (info: PickingInfo) => {
      if (!info.object) return null;

      if (info.layer?.id === 'stations') {
        const station = info.object as Station;
        const stationRoutes = routes.filter((r) => station.routeIds.includes(r.id));
        // Use longName for rail systems (LIRR, Metro-North, NJ Transit), shortName for subway
        const routeNames = stationRoutes.map((r) => {
          const useFullName = r.type === 'rail' && r.systemId !== 'path';
          return useFullName ? (r.longName || r.shortName) : r.shortName;
        }).join(', ');
        return {
          html: `<div style="padding: 8px;">
            <strong>${station.name}</strong>
            <br/>
            <span style="color: #666;">${routeNames || 'Station'}</span>
          </div>`,
          style: {
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          },
        };
      }

      if (info.layer?.id === 'routes-hitarea') {
        const geom = info.object as RouteGeometry;
        const route = routes.find((r) => r.id === geom.routeId);
        if (route) {
          // Use longName for rail systems, shortName for subway
          const useFullName = route.type === 'rail' && route.systemId !== 'path';
          const displayName = useFullName ? (route.longName || route.shortName) : route.shortName;
          const subtitle = useFullName ? route.systemId.toUpperCase().replace(/-/g, ' ') : route.longName;
          return {
            html: `<div style="padding: 8px;">
              <strong>${displayName}</strong>
              <br/>
              <span style="color: #666;">${subtitle}</span>
            </div>`,
            style: {
              backgroundColor: 'white',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            },
          };
        }
      }

      return null;
    },
    [routes]
  );

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
      controller={true}
      layers={layers}
      getTooltip={getTooltip}
      style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0' }}
    >
      <MapGL mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
