// Core transit data types

export type TransitSystemType = 'subway' | 'rail' | 'bus' | 'ferry';

export interface TransitSystem {
  id: string;
  name: string;
  agency: string;
  type: TransitSystemType;
  color: string;
  enabled: boolean;
}

export interface Route {
  id: string;
  systemId: string;
  shortName: string;
  longName: string;
  color: string;
  textColor: string;
  type: TransitSystemType;
  stationOrder?: string[];
  peakHeadwayMinutes?: number;
  offPeakHeadwayMinutes?: number;
}

export interface Station {
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
  annualRidership?: number;
  dailyRidership?: number;
}

export interface Transfer {
  id: string;
  stationIds: string[];
  systemIds: string[];
  type: 'in-station' | 'street' | 'nearby';
  walkingTime?: number;
}

export interface RouteGeometry {
  routeId: string;
  coordinates: [number, number][];
}

export interface TransitData {
  routes: Route[];
  stations: Station[];
  routeGeometries: RouteGeometry[];
}

export interface SystemData {
  system: TransitSystem;
  routes: Route[];
  stations: Station[];
  routeGeometries: RouteGeometry[];
}
