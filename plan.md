# NYC Transit Network Explorer - Project Plans

## Master Implementation Plan

### Overview
A React + TypeScript website for exploring the NYC metropolitan transit network. MVP focuses on interactive map visualization with static pre-processed data (no backend server).

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Mapping**: MapLibre GL JS + deck.gl (via react-map-gl)
- **State**: Zustand
- **Search**: Fuse.js
- **Data**: Static JSON files (pre-processed from GTFS)
- **Deployment**: Vercel or Netlify (static hosting)

### Transit Systems
| System | Data Source | Auth Required | Status |
|--------|-------------|---------------|--------|
| NYC Subway | MTA GTFS | No | Implemented |
| NYC Bus | MTA GTFS | No | Not Started |
| LIRR | MTA GTFS | No | Implemented |
| Metro-North | MTA GTFS | No | Implemented |
| NJ Transit Rail | njtransit.com | No | Implemented |
| PATH | Port Authority | No | Implemented |
| NYC Ferry | ferry.nyc | No | Implemented |
| Staten Island Ferry | NYC Open Data | No | Data source 404 |

### Project Structure
```
nyc-transport-network/
├── public/data/           # Pre-processed JSON (routes, stations, transfers)
├── scripts/               # Data pipeline (download, parse, transform GTFS)
│   ├── download/          # GTFS feed downloaders
│   ├── parse/             # GTFS parsing (uses csv-parse)
│   └── build-data.ts      # Main build orchestrator
├── src/
│   ├── components/
│   │   ├── Map/           # TransitMap, RouteLayer, StationLayer
│   │   ├── Panels/        # SystemSelector, StationDetail, RouteDetail, Search
│   │   └── UI/            # Sidebar, Legend, ErrorBoundary
│   ├── hooks/             # useTransitData, useMapInteraction, useSearch
│   ├── stores/            # mapStore (Zustand)
│   ├── types/             # transit.ts
│   └── services/          # dataLoader
├── package.json
└── vite.config.ts
```

### Data Pipeline
1. **Download**: Fetch GTFS .zip files from each transit agency
2. **Parse**: Extract routes, stops, shapes from GTFS txt files
3. **Transform**:
   - Normalize IDs (prefix with system: `subway:A`, `lirr:oyster-bay`)
   - Convert shapes to coordinate arrays
   - Filter to parent stations for rail systems
   - Map routes to stations via trips and stop_times
   - Extract station ordering from stop_times stop_sequence
   - Compute parallel line offsets for overlapping routes
4. **Output**: Write to `public/data/systems/` as JSON files per system

### Core Components

#### TransitMap.tsx
- deck.gl layers: PathLayer (routes), ScatterplotLayer (stations)
- Hit area layer for reliable route clicking at all zoom levels
- MapLibre base map with Carto tiles
- Click/hover interactions for stations and routes
- Parallel offset rendering for overlapping routes

#### SystemSelector.tsx
- Checkboxes to toggle each transit system on/off
- Color indicators matching official system colors

#### StationDetailPanel.tsx
- Station name, serving routes (as clickable colored badges)
- Click route badge to view route details
- Transfer connections to other systems
- Accessibility info (ADA, elevator)

#### RouteDetailPanel.tsx
- Route badge with color and name
- Stations listed in travel order (from GTFS stop_sequence)
- Click station to view details
- "Zoom to Route" button

#### SearchPanel.tsx
- Fuse.js fuzzy search across stations
- Autocomplete dropdown with system indicators
- Keyboard navigation (arrow keys, enter, escape)

---

## Implementation Phases

### Phase 1: Foundation + Subway (COMPLETE)
- Initialize Vite + React + TypeScript project
- Set up MapLibre GL + deck.gl
- Build data pipeline for MTA Subway GTFS only
- Render subway routes and stations on map
- Basic click interaction (station name popup)

### Phase 2: Multi-System (MOSTLY COMPLETE)
- Extend data pipeline to all systems (LIRR, Metro-North, NJ Transit, PATH, Ferry)
- System toggle UI
- Transfer point visualization
- Lazy-load systems on toggle (for performance)
- **Remaining**: NYC Bus

### Phase 3: Interactivity (COMPLETE)
- Station detail panel (routes, transfers, accessibility)
- Route detail panel (station list, line info)
- Search with autocomplete
- Route highlighting on selection
- "Zoom to route" feature
- Auto-zoom on station/route selection
- Clickable route badges in station panel
- Professional transit map improvements (see below)

### Phase 4: Data Features (COMPLETE)
- Ridership data integration (from data.ny.gov Socrata API, matched to 462/496 subway stations)
- Service frequency calculation (peak/off-peak headway computed from GTFS stop_times)
- Heat map visualization (deck.gl HeatmapLayer with ridership + frequency modes)
- Legend component (floating card with system colors + heatmap gradient scale)
- Heatmap controls (sidebar toggle, metric selector, opacity slider)
- Frequency/ridership data displayed in station and route detail panels

### Future (Post-MVP)
- Construction history timeline
- Fleet/train car information
- Rail yards
- Historical route changes
- Mobile-responsive design

---

## Professional Transit Map Improvements (COMPLETE)

Implemented to make the map look and behave like a professional transit map:

### 1. Route Clickability at All Zoom Levels
- Added invisible "hit area" PathLayer with `widthMinPixels: 15`
- Routes are now reliably clickable even when zoomed out

### 2. LIRR/Metro-North Branch Names
- Rail systems now display branch names instead of route numbers
- "Babylon Branch" instead of "1", "Hudson" instead of numbers
- Logic: Use `longName` when `route.type === 'rail' && route.systemId !== 'path'`
- Applied to tooltips, station panel badges, and route panel headers

### 3. Station Ordering in Route Panel
- Stations are now listed in travel order (not alphabetically)
- Extracted from GTFS stop_times using stop_sequence of longest trip
- Added `stationOrder: string[]` field to Route interface

### 4. Parallel Line Offsets
- Overlapping routes are offset perpendicular to the line
- 10 meters offset per route in shared segments
- Routes on same track are now distinctly visible
- Computed during data build based on coordinate proximity

### 5. Multi-Branch Geometry Support
- Routes with multiple terminals have separate geometries
- LIRR routes show both Penn Station and Atlantic Terminal branches
- NJ Transit HBLR shows all service patterns including 8th St

---

## Data Size (Current)
| System | Routes | Stations | Geometries | File Size |
|--------|--------|----------|------------|-----------|
| Subway | 29 | 496 | 39 | ~1.8 MB |
| LIRR | 13 | 127 | 42 | ~2.9 MB |
| Metro-North | 6 | 114 | 7 | ~1.7 MB |
| PATH | 6 | 43 | 6 | ~17 KB |
| NYC Ferry | 8 | 50 | 9 | ~47 KB |
| NJ Transit Rail | 16 | 227 | 47 | ~1.4 MB |
| **Total** | **78** | **1057** | **150** | **~8 MB** |

---

## Verification Plan
1. **Data pipeline**: Run `npm run data:build` and verify JSON files are generated
2. **Dev server**: Run `npm run dev` and verify map renders with subway routes
3. **Interactions**: Click stations/routes and verify panels display correct data
4. **System toggles**: Toggle each system on/off and verify map updates
5. **Search**: Search for "Times Square" and verify autocomplete works
6. **Route clicking**: Verify routes are clickable at all zoom levels
7. **Station ordering**: Verify route panel shows stations in travel order
8. **Branch names**: Verify LIRR/Metro-North show branch names not numbers
9. **Parallel offsets**: Zoom into Penn Station area, verify all lines visible
10. **Build**: Run `npm run build` and verify production bundle works
11. **Deploy**: Deploy to Vercel and verify live site loads correctly

---

## Known Challenges
- **Bus data volume**: 15,000+ stops require level-of-detail handling (hide at low zoom)
- **Transfer detection**: Some walking transfers aren't in official data; use spatial proximity
- **Data freshness**: GTFS feeds update irregularly; plan for periodic re-processing
- **Staten Island Ferry**: Data source currently returns 404; may need alternative source
