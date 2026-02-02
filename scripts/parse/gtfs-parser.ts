import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as unzipper from 'unzipper';

// Type definitions
type TransitSystemType = 'subway' | 'rail' | 'bus' | 'ferry';

interface TransitSystem {
  id: string;
  name: string;
  agency: string;
  type: TransitSystemType;
  color: string;
  enabled: boolean;
}

interface Route {
  id: string;
  systemId: string;
  shortName: string;
  longName: string;
  color: string;
  textColor: string;
  type: TransitSystemType;
  stationOrder?: string[];
}

interface Station {
  id: string;
  systemId: string;
  name: string;
  latitude: number;
  longitude: number;
  routeIds: string[];
  isTransferPoint: boolean;
  transferStationIds?: string[];
  accessibility?: {
    ada: boolean;
    elevator: boolean;
  };
}

interface RouteGeometry {
  routeId: string;
  coordinates: [number, number][];
}

export interface SystemData {
  system: TransitSystem;
  routes: Route[];
  stations: Station[];
  routeGeometries: RouteGeometry[];
}

// Compute parallel line offsets for routes that share track segments
function computeParallelOffsets(geometries: RouteGeometry[]): RouteGeometry[] {
  if (geometries.length <= 1) return geometries;

  // Round coordinates to detect shared points (within ~10m tolerance at NYC latitude)
  const precision = 4; // ~11m per unit at 40°N

  // Build map of rounded coordinate -> set of routes using that point
  const coordRouteMap = new Map<string, Set<string>>();
  for (const geom of geometries) {
    for (const coord of geom.coordinates) {
      const key = `${coord[0].toFixed(precision)},${coord[1].toFixed(precision)}`;
      if (!coordRouteMap.has(key)) coordRouteMap.set(key, new Set());
      coordRouteMap.get(key)!.add(geom.routeId);
    }
  }

  // For each route, calculate max overlap and determine offset
  const routeOffsetMap = new Map<string, number>();

  for (const geom of geometries) {
    // Find all routes that share any coordinates with this route
    const overlappingRoutes = new Set<string>();
    for (const coord of geom.coordinates) {
      const key = `${coord[0].toFixed(precision)},${coord[1].toFixed(precision)}`;
      const routes = coordRouteMap.get(key);
      if (routes && routes.size > 1) {
        routes.forEach((r) => overlappingRoutes.add(r));
      }
    }

    if (overlappingRoutes.size <= 1) {
      // No overlap, no offset needed
      routeOffsetMap.set(geom.routeId, 0);
    } else {
      // Assign offset index based on sorted route order
      const sortedRoutes = Array.from(overlappingRoutes).sort();
      const offsetIndex = sortedRoutes.indexOf(geom.routeId);
      const totalRoutes = sortedRoutes.length;
      // Center offsets around 0: e.g., 3 routes get offsets -1, 0, 1
      routeOffsetMap.set(geom.routeId, offsetIndex - (totalRoutes - 1) / 2);
    }
  }

  // Count routes with offsets
  let offsetCount = 0;
  routeOffsetMap.forEach((offset) => {
    if (offset !== 0) offsetCount++;
  });
  if (offsetCount > 0) {
    console.log(`Applied parallel line offsets to ${offsetCount} routes`);
  }

  // Apply perpendicular offsets to coordinates
  const OFFSET_METERS = 10; // Offset distance in meters per route index
  return geometries.map((geom) => ({
    routeId: geom.routeId,
    coordinates: offsetPath(geom.coordinates, (routeOffsetMap.get(geom.routeId) || 0) * OFFSET_METERS),
  }));
}

// Offset a path perpendicular to its direction
function offsetPath(coords: [number, number][], offsetMeters: number): [number, number][] {
  if (offsetMeters === 0 || coords.length < 2) return coords;

  // Conversion factors at NYC latitude (~40.7°N)
  const metersPerDegreeLon = 85000; // ~85km per degree longitude
  const metersPerDegreeLat = 111000; // ~111km per degree latitude

  return coords.map((coord, i) => {
    // Get adjacent points for direction calculation
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];

    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return coord;

    // Perpendicular unit vector (rotate 90 degrees counterclockwise)
    const perpX = -dy / len;
    const perpY = dx / len;

    // Apply offset in meters, converted to degrees
    return [
      coord[0] + (perpX * offsetMeters) / metersPerDegreeLon,
      coord[1] + (perpY * offsetMeters) / metersPerDegreeLat,
    ] as [number, number];
  });
}

// System configurations
interface SystemConfig {
  id: string;
  name: string;
  agency: string;
  type: TransitSystemType;
  color: string;
  lineColors?: Record<string, { color: string; textColor: string }>;
}

const SYSTEM_CONFIGS: Record<string, SystemConfig> = {
  subway: {
    id: 'subway',
    name: 'NYC Subway',
    agency: 'MTA',
    type: 'subway',
    color: '#0039A6',
    lineColors: {
      A: { color: '#0039A6', textColor: '#FFFFFF' },
      C: { color: '#0039A6', textColor: '#FFFFFF' },
      E: { color: '#0039A6', textColor: '#FFFFFF' },
      B: { color: '#FF6319', textColor: '#FFFFFF' },
      D: { color: '#FF6319', textColor: '#FFFFFF' },
      F: { color: '#FF6319', textColor: '#FFFFFF' },
      M: { color: '#FF6319', textColor: '#FFFFFF' },
      G: { color: '#6CBE45', textColor: '#FFFFFF' },
      L: { color: '#A7A9AC', textColor: '#000000' },
      J: { color: '#996633', textColor: '#FFFFFF' },
      Z: { color: '#996633', textColor: '#FFFFFF' },
      N: { color: '#FCCC0A', textColor: '#000000' },
      Q: { color: '#FCCC0A', textColor: '#000000' },
      R: { color: '#FCCC0A', textColor: '#000000' },
      W: { color: '#FCCC0A', textColor: '#000000' },
      '1': { color: '#EE352E', textColor: '#FFFFFF' },
      '2': { color: '#EE352E', textColor: '#FFFFFF' },
      '3': { color: '#EE352E', textColor: '#FFFFFF' },
      '4': { color: '#00933C', textColor: '#FFFFFF' },
      '5': { color: '#00933C', textColor: '#FFFFFF' },
      '6': { color: '#00933C', textColor: '#FFFFFF' },
      '7': { color: '#B933AD', textColor: '#FFFFFF' },
      S: { color: '#808183', textColor: '#FFFFFF' },
      SIR: { color: '#0039A6', textColor: '#FFFFFF' },
      FS: { color: '#808183', textColor: '#FFFFFF' },
      GS: { color: '#808183', textColor: '#FFFFFF' },
      H: { color: '#808183', textColor: '#FFFFFF' },
    },
  },
  lirr: {
    id: 'lirr',
    name: 'Long Island Rail Road',
    agency: 'MTA',
    type: 'rail',
    color: '#0039A6',
    lineColors: {
      // LIRR branches
      Babylon: { color: '#00985F', textColor: '#FFFFFF' },
      'City Terminal Zone': { color: '#4D5357', textColor: '#FFFFFF' },
      'Far Rockaway': { color: '#6E3219', textColor: '#FFFFFF' },
      Hempstead: { color: '#CE8E00', textColor: '#000000' },
      'Long Beach': { color: '#FF6319', textColor: '#FFFFFF' },
      Montauk: { color: '#00B2A9', textColor: '#FFFFFF' },
      'Oyster Bay': { color: '#00AF3F', textColor: '#FFFFFF' },
      'Port Jefferson': { color: '#006EC7', textColor: '#FFFFFF' },
      'Port Washington': { color: '#C60C30', textColor: '#FFFFFF' },
      Ronkonkoma: { color: '#A626AA', textColor: '#FFFFFF' },
      'West Hempstead': { color: '#00A1DE', textColor: '#FFFFFF' },
    },
  },
  'metro-north': {
    id: 'metro-north',
    name: 'Metro-North Railroad',
    agency: 'MTA',
    type: 'rail',
    color: '#0039A6',
    lineColors: {
      // Metro-North lines
      Hudson: { color: '#009B3A', textColor: '#FFFFFF' },
      Harlem: { color: '#0039A6', textColor: '#FFFFFF' },
      'New Haven': { color: '#EE0034', textColor: '#FFFFFF' },
      'New Canaan': { color: '#EE0034', textColor: '#FFFFFF' },
      Danbury: { color: '#EE0034', textColor: '#FFFFFF' },
      Waterbury: { color: '#EE0034', textColor: '#FFFFFF' },
      'Pascack Valley': { color: '#8E258D', textColor: '#FFFFFF' },
      'Port Jervis': { color: '#FF7900', textColor: '#FFFFFF' },
    },
  },
  path: {
    id: 'path',
    name: 'PATH',
    agency: 'Port Authority',
    type: 'subway',
    color: '#E66B00',
    lineColors: {
      // PATH lines
      'Newark-World Trade Center': { color: '#D93A30', textColor: '#FFFFFF' },
      'Hoboken-World Trade Center': { color: '#009E58', textColor: '#FFFFFF' },
      'Journal Square-33rd Street': { color: '#FDB827', textColor: '#000000' },
      'Hoboken-33rd Street': { color: '#2E3E93', textColor: '#FFFFFF' },
      NWK: { color: '#D93A30', textColor: '#FFFFFF' },
      WTC: { color: '#D93A30', textColor: '#FFFFFF' },
      HOB: { color: '#009E58', textColor: '#FFFFFF' },
      JSQ: { color: '#FDB827', textColor: '#000000' },
      '33S': { color: '#2E3E93', textColor: '#FFFFFF' },
    },
  },
  'nyc-ferry': {
    id: 'nyc-ferry',
    name: 'NYC Ferry',
    agency: 'NYC Ferry',
    type: 'ferry',
    color: '#F7931E',
    lineColors: {
      // NYC Ferry routes
      'Astoria': { color: '#0095DA', textColor: '#FFFFFF' },
      'East River': { color: '#00B2A9', textColor: '#FFFFFF' },
      'Rockaway': { color: '#F15A29', textColor: '#FFFFFF' },
      'South Brooklyn': { color: '#FCCC0A', textColor: '#000000' },
      'Soundview': { color: '#5C4084', textColor: '#FFFFFF' },
      'St. George': { color: '#009B3A', textColor: '#FFFFFF' },
      'Governors Island': { color: '#ED1C24', textColor: '#FFFFFF' },
    },
  },
  'staten-island-ferry': {
    id: 'staten-island-ferry',
    name: 'Staten Island Ferry',
    agency: 'NYC DOT',
    type: 'ferry',
    color: '#FF6600',
  },
  'nj-transit-rail': {
    id: 'nj-transit-rail',
    name: 'NJ Transit Rail',
    agency: 'NJ Transit',
    type: 'rail',
    color: '#003366',
    lineColors: {
      // NJ Transit Rail lines - using route_long_name from GTFS
      'Northeast Corrdr': { color: '#D21034', textColor: '#FFFFFF' },
      'Northeast Corridor': { color: '#D21034', textColor: '#FFFFFF' },
      'No Jersey Coast': { color: '#FF6600', textColor: '#FFFFFF' },
      'North Jersey Coast': { color: '#FF6600', textColor: '#FFFFFF' },
      'Raritan Valley': { color: '#0066CC', textColor: '#FFFFFF' },
      'Main/Bergen': { color: '#FFD700', textColor: '#000000' },
      'Main Line': { color: '#FFD700', textColor: '#000000' },
      'Bergen County Line': { color: '#FFD700', textColor: '#000000' },
      'Montclr-Boonton': { color: '#00AA44', textColor: '#FFFFFF' },
      'Montclair-Boonton': { color: '#00AA44', textColor: '#FFFFFF' },
      'Morris & Essex': { color: '#7B2D8E', textColor: '#FFFFFF' },
      'Morristown Line': { color: '#7B2D8E', textColor: '#FFFFFF' },
      'Gladstone Branch': { color: '#7B2D8E', textColor: '#FFFFFF' },
      'Pascack Valley': { color: '#8B4513', textColor: '#FFFFFF' },
      'Atlantic City': { color: '#00BFFF', textColor: '#FFFFFF' },
      'Atlantic City Line': { color: '#00BFFF', textColor: '#FFFFFF' },
      // Short name fallbacks
      'NEC': { color: '#D21034', textColor: '#FFFFFF' },
      'NJCL': { color: '#FF6600', textColor: '#FFFFFF' },
      'RVL': { color: '#0066CC', textColor: '#FFFFFF' },
      'M&E': { color: '#7B2D8E', textColor: '#FFFFFF' },
      'MOBO': { color: '#00AA44', textColor: '#FFFFFF' },
      'PVL': { color: '#8B4513', textColor: '#FFFFFF' },
      'ACL': { color: '#00BFFF', textColor: '#FFFFFF' },
    },
  },
};

interface GTFSRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color?: string;
  route_text_color?: string;
}

interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  parent_station?: string;
  wheelchair_boarding?: string;
  location_type?: string;
}

interface GTFSShape {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
}

interface GTFSTrip {
  trip_id: string;
  route_id: string;
  shape_id?: string;
}

interface GTFSStopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence?: string;
}

async function extractGTFS(zipPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  const directory = await unzipper.Open.file(zipPath);

  for (const file of directory.files) {
    if (file.path.endsWith('.txt')) {
      const content = await file.buffer();
      const fileName = path.basename(file.path);
      files.set(fileName, content.toString('utf-8'));
    }
  }

  return files;
}

function parseCSV<T>(content: string): T[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

export async function parseGTFS(gtfsPath: string, systemId: string): Promise<SystemData> {
  const config = SYSTEM_CONFIGS[systemId];
  if (!config) {
    throw new Error(`Unknown system: ${systemId}`);
  }

  console.log(`Parsing ${config.name} GTFS from: ${gtfsPath}`);

  const files = await extractGTFS(gtfsPath);

  // Parse routes
  const routesContent = files.get('routes.txt');
  if (!routesContent) throw new Error('routes.txt not found in GTFS');
  const gtfsRoutes = parseCSV<GTFSRoute>(routesContent);

  // Parse stops
  const stopsContent = files.get('stops.txt');
  if (!stopsContent) throw new Error('stops.txt not found in GTFS');
  const gtfsStops = parseCSV<GTFSStop>(stopsContent);

  // Parse shapes (optional)
  const shapesContent = files.get('shapes.txt');
  const gtfsShapes = shapesContent ? parseCSV<GTFSShape>(shapesContent) : [];

  // Parse trips
  const tripsContent = files.get('trips.txt');
  if (!tripsContent) throw new Error('trips.txt not found in GTFS');
  const gtfsTrips = parseCSV<GTFSTrip>(tripsContent);

  // Parse stop_times
  const stopTimesContent = files.get('stop_times.txt');
  if (!stopTimesContent) throw new Error('stop_times.txt not found in GTFS');
  const gtfsStopTimes = parseCSV<GTFSStopTime>(stopTimesContent);

  console.log(`Found ${gtfsRoutes.length} routes`);
  console.log(`Found ${gtfsStops.length} stops`);
  console.log(`Found ${gtfsShapes.length} shape points`);
  console.log(`Found ${gtfsTrips.length} trips`);

  // Convert routes
  const routes: Route[] = gtfsRoutes.map((r) => {
    const shortName = r.route_short_name || r.route_id;
    const longName = r.route_long_name || '';

    // Try to find color from config, then from GTFS
    let colorInfo = config.lineColors?.[shortName] || config.lineColors?.[longName];
    if (!colorInfo) {
      colorInfo = {
        color: r.route_color ? `#${r.route_color}` : config.color,
        textColor: r.route_text_color ? `#${r.route_text_color}` : '#FFFFFF',
      };
    }

    return {
      id: `${systemId}:${r.route_id}`,
      systemId,
      shortName,
      longName,
      color: colorInfo.color,
      textColor: colorInfo.textColor,
      type: config.type,
    };
  });

  // Build a map of which routes serve which stops
  const stopRouteMap = new Map<string, Set<string>>();

  // Get route IDs for each trip
  const tripRouteMap = new Map<string, string>();
  gtfsTrips.forEach((trip) => {
    tripRouteMap.set(trip.trip_id, trip.route_id);
  });

  // Map stops to routes via stop_times and trips
  gtfsStopTimes.forEach((st) => {
    const routeId = tripRouteMap.get(st.trip_id);
    if (routeId && st.stop_id) {
      if (!stopRouteMap.has(st.stop_id)) {
        stopRouteMap.set(st.stop_id, new Set());
      }
      stopRouteMap.get(st.stop_id)!.add(`${systemId}:${routeId}`);
    }
  });

  // Convert stops to stations
  // For rail systems, filter to parent stations only
  // For ferry, include all stops
  let filteredStops = gtfsStops;
  if (config.type === 'subway' || config.type === 'rail') {
    filteredStops = gtfsStops.filter(
      (s) => s.location_type === '1' || (!s.parent_station || s.parent_station === '')
    );
  }

  const stations: Station[] = filteredStops
    .filter((s) => s.stop_lat && s.stop_lon && parseFloat(s.stop_lat) !== 0)
    .map((s) => {
      // Get routes for this stop and its children
      let routeIds = Array.from(stopRouteMap.get(s.stop_id) || []);

      // If this is a parent station, also get routes from child stops
      if (s.location_type === '1') {
        gtfsStops
          .filter((child) => child.parent_station === s.stop_id)
          .forEach((child) => {
            const childRoutes = stopRouteMap.get(child.stop_id);
            if (childRoutes) {
              routeIds = [...routeIds, ...Array.from(childRoutes)];
            }
          });
      }

      // Deduplicate
      routeIds = [...new Set(routeIds)];

      return {
        id: `${systemId}:${s.stop_id}`,
        systemId,
        name: s.stop_name || 'Unknown Station',
        latitude: parseFloat(s.stop_lat),
        longitude: parseFloat(s.stop_lon),
        routeIds,
        isTransferPoint: routeIds.length > 1,
        accessibility:
          s.wheelchair_boarding === '1'
            ? { ada: true, elevator: true }
            : undefined,
      };
    });

  // Build station ordering for each route from stop_times stop_sequence
  // Map child stop_id to parent station_id for rail systems
  const stopToStationMap = new Map<string, string>();
  gtfsStops.forEach((s) => {
    const stationId = s.parent_station && s.parent_station !== '' ? s.parent_station : s.stop_id;
    stopToStationMap.set(s.stop_id, `${systemId}:${stationId}`);
  });

  // Create a set of valid station IDs for filtering
  const validStationIds = new Set(stations.map((s) => s.id));

  // Group stop_times by trip_id and sort by sequence
  const tripStopSequences = new Map<string, Array<{ stopId: string; seq: number }>>();
  gtfsStopTimes.forEach((st) => {
    if (!tripStopSequences.has(st.trip_id)) {
      tripStopSequences.set(st.trip_id, []);
    }
    tripStopSequences.get(st.trip_id)!.push({
      stopId: st.stop_id,
      seq: st.stop_sequence ? parseInt(st.stop_sequence, 10) : 0,
    });
  });

  // Sort each trip's stops by sequence
  tripStopSequences.forEach((stops) => {
    stops.sort((a, b) => a.seq - b.seq);
  });

  // For each route, find the longest trip and extract ordered station IDs
  const routeStationOrder = new Map<string, string[]>();

  // Group trips by route
  const routeTripsMap = new Map<string, string[]>();
  gtfsTrips.forEach((trip) => {
    if (!routeTripsMap.has(trip.route_id)) {
      routeTripsMap.set(trip.route_id, []);
    }
    routeTripsMap.get(trip.route_id)!.push(trip.trip_id);
  });

  routeTripsMap.forEach((tripIds, routeId) => {
    // Find the trip with the most stops
    let longestTripStops: Array<{ stopId: string; seq: number }> = [];
    tripIds.forEach((tripId) => {
      const stops = tripStopSequences.get(tripId) || [];
      if (stops.length > longestTripStops.length) {
        longestTripStops = stops;
      }
    });

    // Convert to station IDs, deduplicate while preserving order
    const orderedStationIds: string[] = [];
    const seen = new Set<string>();
    longestTripStops.forEach((stop) => {
      const stationId = stopToStationMap.get(stop.stopId);
      if (stationId && !seen.has(stationId) && validStationIds.has(stationId)) {
        seen.add(stationId);
        orderedStationIds.push(stationId);
      }
    });

    if (orderedStationIds.length > 0) {
      routeStationOrder.set(`${systemId}:${routeId}`, orderedStationIds);
    }
  });

  // Add station order to routes
  routes.forEach((route) => {
    const order = routeStationOrder.get(route.id);
    if (order) {
      route.stationOrder = order;
    }
  });

  console.log(`Built station ordering for ${routeStationOrder.size} routes`);

  // Group shapes by shape_id and build route geometries
  const shapeMap = new Map<string, Array<{ lat: number; lon: number; seq: number }>>();

  gtfsShapes.forEach((point) => {
    if (!shapeMap.has(point.shape_id)) {
      shapeMap.set(point.shape_id, []);
    }
    shapeMap.get(point.shape_id)!.push({
      lat: parseFloat(point.shape_pt_lat),
      lon: parseFloat(point.shape_pt_lon),
      seq: parseInt(point.shape_pt_sequence, 10),
    });
  });

  // Sort shape points by sequence
  shapeMap.forEach((points) => {
    points.sort((a, b) => a.seq - b.seq);
  });

  // Collect all shapes for each route via trips
  const routeShapesMap = new Map<string, Set<string>>();
  gtfsTrips.forEach((trip) => {
    if (trip.shape_id) {
      if (!routeShapesMap.has(trip.route_id)) {
        routeShapesMap.set(trip.route_id, new Set());
      }
      routeShapesMap.get(trip.route_id)!.add(trip.shape_id);
    }
  });

  // For each route, group shapes by their western terminal (endpoint cluster)
  // and pick the longest shape for each terminal
  const routeShapesList = new Map<string, string[]>();

  routeShapesMap.forEach((shapeIds, routeId) => {
    // Get endpoint info for each shape (including lat for proper clustering)
    const shapeEndpoints: Array<{
      shapeId: string;
      westLon: number;
      westLat: number;
      eastLon: number;
      pointCount: number;
    }> = [];

    shapeIds.forEach((shapeId) => {
      const points = shapeMap.get(shapeId);
      if (points && points.length > 0) {
        // Find westernmost point
        let westPoint = points[0];
        for (const p of points) {
          if (p.lon < westPoint.lon) {
            westPoint = p;
          }
        }
        const lons = points.map((p) => p.lon);
        shapeEndpoints.push({
          shapeId,
          westLon: westPoint.lon,
          westLat: westPoint.lat,
          eastLon: Math.max(...lons),
          pointCount: points.length,
        });
      }
    });

    // Cluster by western endpoint (within 0.01 degrees for lon AND lat = ~1km)
    const terminalClusters: Array<{
      lon: number;
      lat: number;
      shapes: typeof shapeEndpoints;
    }> = [];
    const clusterThreshold = 0.015; // ~1.5km

    shapeEndpoints.forEach((shape) => {
      // Find existing cluster using both lon and lat
      let foundCluster = false;
      for (const cluster of terminalClusters) {
        const lonDiff = Math.abs(shape.westLon - cluster.lon);
        const latDiff = Math.abs(shape.westLat - cluster.lat);
        if (lonDiff < clusterThreshold && latDiff < clusterThreshold) {
          cluster.shapes.push(shape);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        terminalClusters.push({
          lon: shape.westLon,
          lat: shape.westLat,
          shapes: [shape],
        });
      }
    });

    // For each terminal cluster, pick the longest shape
    const selectedShapes: string[] = [];
    terminalClusters.forEach((cluster) => {
      // Sort by point count descending
      cluster.shapes.sort((a, b) => b.pointCount - a.pointCount);
      if (cluster.shapes.length > 0) {
        selectedShapes.push(cluster.shapes[0].shapeId);
      }
    });

    if (selectedShapes.length > 0) {
      routeShapesList.set(routeId, selectedShapes);
    }
  });

  // Build route geometries (multiple per route if needed)
  const routeGeometries: RouteGeometry[] = [];

  routeShapesList.forEach((shapeIds, routeId) => {
    shapeIds.forEach((shapeId) => {
      const points = shapeMap.get(shapeId);
      if (points && points.length > 0) {
        routeGeometries.push({
          routeId: `${systemId}:${routeId}`,
          coordinates: points.map((p) => [p.lon, p.lat] as [number, number]),
        });
      }
    });
  });

  // Fallback: Generate route geometries from stop locations if no shapes available
  if (routeGeometries.length === 0 && gtfsShapes.length === 0) {
    console.log('No shapes found - generating route geometries from stops...');

    // Build stop location map
    const stopLocationMap = new Map<string, { lat: number; lon: number }>();
    gtfsStops.forEach((s) => {
      if (s.stop_lat && s.stop_lon) {
        stopLocationMap.set(s.stop_id, {
          lat: parseFloat(s.stop_lat),
          lon: parseFloat(s.stop_lon),
        });
      }
    });

    // Group stop_times by trip and get stop sequences
    const tripStopSequences = new Map<string, Array<{ stopId: string; seq: number }>>();
    gtfsStopTimes.forEach((st) => {
      if (!tripStopSequences.has(st.trip_id)) {
        tripStopSequences.set(st.trip_id, []);
      }
      tripStopSequences.get(st.trip_id)!.push({
        stopId: st.stop_id,
        seq: st.stop_sequence ? parseInt(st.stop_sequence, 10) : 0,
      });
    });

    // Sort each trip's stops by sequence
    tripStopSequences.forEach((stops) => {
      stops.sort((a, b) => a.seq - b.seq);
    });

    // For each route, find the longest trip and use its stop sequence
    const routeTripMap = new Map<string, string[]>();
    gtfsTrips.forEach((trip) => {
      if (!routeTripMap.has(trip.route_id)) {
        routeTripMap.set(trip.route_id, []);
      }
      routeTripMap.get(trip.route_id)!.push(trip.trip_id);
    });

    routeTripMap.forEach((tripIds, routeId) => {
      // Find trip with most stops
      let longestTrip: Array<{ stopId: string; seq: number }> = [];
      tripIds.forEach((tripId) => {
        const stops = tripStopSequences.get(tripId) || [];
        if (stops.length > longestTrip.length) {
          longestTrip = stops;
        }
      });

      if (longestTrip.length > 1) {
        const coordinates: [number, number][] = [];
        longestTrip.forEach((stop) => {
          const loc = stopLocationMap.get(stop.stopId);
          if (loc) {
            coordinates.push([loc.lon, loc.lat]);
          }
        });

        if (coordinates.length > 1) {
          routeGeometries.push({
            routeId: `${systemId}:${routeId}`,
            coordinates,
          });
        }
      }
    });

    console.log(`Generated ${routeGeometries.length} route geometries from stops`);
  }

  // Compute parallel line offsets for overlapping routes
  // Note: routeGeometries may contain multiple geometries per route (different branches/terminals)
  const offsetGeometries = computeParallelOffsets(routeGeometries);

  const system: TransitSystem = {
    id: config.id,
    name: config.name,
    agency: config.agency,
    type: config.type,
    color: config.color,
    enabled: systemId === 'subway', // Only subway enabled by default
  };

  console.log(`Processed ${routes.length} routes`);
  console.log(`Processed ${stations.length} stations`);
  console.log(`Processed ${offsetGeometries.length} route geometries`);

  return {
    system,
    routes,
    stations,
    routeGeometries: offsetGeometries,
  };
}

// Legacy function for backwards compatibility
export async function parseSubwayGTFS(gtfsPath: string): Promise<SystemData> {
  return parseGTFS(gtfsPath, 'subway');
}

export async function writeSystemData(data: SystemData, outputDir: string): Promise<void> {
  const outputPath = path.join(outputDir, `${data.system.id}.json`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Written: ${outputPath}`);

  // Calculate file size
  const stats = fs.statSync(outputPath);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
}
