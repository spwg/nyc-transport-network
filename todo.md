# NYC Transit Network Explorer - Todo List

## Phase 1: Foundation + Subway (COMPLETE)
- [x] Initialize Vite + React + TypeScript project
- [x] Set up MapLibre GL + deck.gl
- [x] Build data pipeline for MTA Subway GTFS
- [x] Render subway routes and stations on map
- [x] Basic click interaction (station detail panel)
- [ ] Deploy to Vercel

## Phase 2: Multi-System (MOSTLY COMPLETE)
- [x] Add LIRR to data pipeline
- [x] Add Metro-North to data pipeline
- [x] Add PATH to data pipeline
- [x] Add NYC Ferry to data pipeline
- [x] Add Staten Island Ferry to data pipeline (data source currently 404)
- [x] Add NJ Transit Rail to data pipeline
- [ ] Add NYC Bus to data pipeline
- [x] System toggle UI (SystemSelector)
- [x] Transfer point visualization (larger dots)
- [x] Lazy-load systems on toggle

## Phase 3: Interactivity (COMPLETE)
- [x] Station detail panel with routes and accessibility
- [x] Route detail panel (station list, line info)
- [x] Search with autocomplete (Fuse.js)
- [x] Route highlighting on selection
- [x] "Zoom to route" feature
- [x] Auto-zoom on station selection
- [x] Auto-zoom on route selection
- [x] Clickable route badges in station panel
- [x] Gray out non-selected routes and stations
- [x] Route outline layer for visibility

## Phase 3.5: Professional Transit Map Improvements (COMPLETE)
- [x] Route clickability at all zoom levels (hit area layer)
- [x] LIRR/Metro-North display branch names instead of numbers
- [x] Station ordering in route panel (travel order from GTFS)
- [x] Parallel line offsets for overlapping routes
- [x] Multi-branch geometry support (Penn + Atlantic Terminal)

## Phase 4: Data Features (COMPLETE)
- [x] Legend component (floating card, shows active systems + heatmap scale)
- [x] Service frequency calculation (peak/off-peak headway from GTFS stop_times)
- [x] Ridership data integration (MTA data.ny.gov Socrata API, 462 stations matched)
- [x] Heat map visualization (deck.gl HeatmapLayer, ridership + frequency modes)
- [x] Heatmap controls in sidebar (toggle, metric selector, opacity slider)
- [x] Display frequency + ridership in station/route detail panels

## Documentation
- [x] Create spec.md (user-facing functionality)
- [x] Create README.md (project overview, setup, adding systems)
- [x] Create plan.md (implementation plans)
- [x] Create todo.md (this file)
- [x] Update documentation for professional map improvements

## Future Enhancements
- [ ] Construction history timeline
- [ ] Fleet/train car information
- [ ] Rail yards visualization
- [ ] Historical route changes
- [ ] Mobile-responsive design
- [ ] Dark mode support
- [ ] Offline support (PWA)
- [ ] Real-time train positions (GTFS-RT)

## Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Configure production deployment
- [ ] Set up automated GTFS data refresh

## Known Issues
- [ ] Staten Island Ferry GTFS source returns 404
- [ ] Station ordering depends on GTFS trip data quality
