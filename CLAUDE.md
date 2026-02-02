# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:5173)
npm run build            # TypeScript check + production build
npm run lint             # ESLint

# Data pipeline
npm run data:build                    # Build all transit system data
npm run data:build <system>           # Build specific system (e.g., subway, lirr)
```

## Architecture

### Overview
React + TypeScript app for visualizing NYC metropolitan transit networks on an interactive map. Uses pre-processed static JSON data (no backend).

### Data Flow
```
GTFS feeds → scripts/parse/gtfs-parser.ts → public/data/systems/*.json → Frontend
```

### Key Files

**Frontend State & Data:**
- `src/stores/mapStore.ts` - Zustand store: view state, selections, enabled systems, zoom functions
- `src/hooks/useTransitData.ts` - Loads and caches system JSON files based on enabled systems
- `src/types/transit.ts` - Core TypeScript interfaces (Route, Station, RouteGeometry)

**Map Rendering:**
- `src/components/Map/TransitMap.tsx` - deck.gl layers (PathLayer for routes, ScatterplotLayer for stations) with MapLibre base map. Three route layers: hit area (invisible, for clicking), outline, and colored routes.

**Data Pipeline:**
- `scripts/build-data.ts` - Orchestrates GTFS download and parsing for all systems
- `scripts/parse/gtfs-parser.ts` - Transforms GTFS to app JSON. Contains `SYSTEM_CONFIGS` with line colors. Handles station ordering, parallel line offsets, and branch geometry support.

### Adding a Transit System
1. Add to `TRANSIT_SYSTEMS` in `src/constants/systems.ts`
2. Add `SYSTEM_CONFIGS` entry in `scripts/parse/gtfs-parser.ts` (with line colors)
3. Add to `SYSTEMS` array in `scripts/build-data.ts` (with download function)
4. Run `npm run data:build <system-id>`

### Route Display Logic
- Subway/PATH: Use `shortName` (single letter/number)
- LIRR/Metro-North/NJ Transit: Use `longName` (branch names)
- Logic: `route.type === 'rail' && route.systemId !== 'path'`

### Documentation
- `spec.md` - User-facing functionality specification
- `plan.md` - Implementation roadmap and technical details
- `todo.md` - Task tracking with completion status
