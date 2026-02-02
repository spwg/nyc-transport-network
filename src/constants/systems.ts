import type { TransitSystem } from '@/types/transit';

export const TRANSIT_SYSTEMS: TransitSystem[] = [
  {
    id: 'subway',
    name: 'NYC Subway',
    agency: 'MTA',
    type: 'subway',
    color: '#0039A6',
    enabled: true,
  },
  {
    id: 'lirr',
    name: 'Long Island Rail Road',
    agency: 'MTA',
    type: 'rail',
    color: '#0D5CAB',
    enabled: false,
  },
  {
    id: 'metro-north',
    name: 'Metro-North',
    agency: 'MTA',
    type: 'rail',
    color: '#0D5CAB',
    enabled: false,
  },
  {
    id: 'path',
    name: 'PATH',
    agency: 'Port Authority',
    type: 'subway',
    color: '#E66B00',
    enabled: false,
  },
  {
    id: 'nyc-ferry',
    name: 'NYC Ferry',
    agency: 'NYC Ferry',
    type: 'ferry',
    color: '#F7931E',
    enabled: false,
  },
  {
    id: 'nj-transit-rail',
    name: 'NJ Transit Rail',
    agency: 'NJ Transit',
    type: 'rail',
    color: '#003366',
    enabled: false,
  },
  // Future systems (data not yet available):
  // {
  //   id: 'bus',
  //   name: 'NYC Bus',
  //   agency: 'MTA',
  //   type: 'bus',
  //   color: '#1C7ED6',
  //   enabled: false,
  // },
  // {
  //   id: 'staten-island-ferry',
  //   name: 'Staten Island Ferry',
  //   agency: 'NYC DOT',
  //   type: 'ferry',
  //   color: '#FF6600',
  //   enabled: false,
  // },
];

export const SUBWAY_LINE_COLORS: Record<string, string> = {
  // IND Eighth Avenue Line
  A: '#0039A6',
  C: '#0039A6',
  E: '#0039A6',
  // IND Sixth Avenue Line
  B: '#FF6319',
  D: '#FF6319',
  F: '#FF6319',
  M: '#FF6319',
  // IND Crosstown Line
  G: '#6CBE45',
  // BMT Canarsie Line
  L: '#A7A9AC',
  // BMT Nassau Street Line
  J: '#996633',
  Z: '#996633',
  // BMT Broadway Line
  N: '#FCCC0A',
  Q: '#FCCC0A',
  R: '#FCCC0A',
  W: '#FCCC0A',
  // IRT Broadway-Seventh Avenue Line
  '1': '#EE352E',
  '2': '#EE352E',
  '3': '#EE352E',
  // IRT Lexington Avenue Line
  '4': '#00933C',
  '5': '#00933C',
  '6': '#00933C',
  // IRT Flushing Line
  '7': '#B933AD',
  // Shuttles
  S: '#808183',
  // Staten Island Railway
  SIR: '#0039A6',
};

export const INITIAL_VIEW_STATE = {
  longitude: -73.985428,
  latitude: 40.748817,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
