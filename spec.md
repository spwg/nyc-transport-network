# NYC Transit Network Explorer - Specification

## Overview

NYC Transit Network Explorer is an interactive web application for exploring the New York City metropolitan transit network. Users can visualize subway lines, commuter rail, ferries, and regional transit systems on an interactive map, view station details, and filter by transit system.

## User Interface

### Layout

The application uses a three-panel layout:

| Panel | Position | Width | Purpose |
|-------|----------|-------|---------|
| Sidebar | Left | 280px | Search and transit system controls |
| Map | Center | Flexible | Interactive transit map |
| Detail Panel | Right | 320px | Station or route information (when selected) |

A header bar displays the application title "NYC Transit Network Explorer" at the top.

### Map View

The map displays the NYC metropolitan area centered on Manhattan. Users can:

- **Pan**: Click and drag to move around the map
- **Zoom**: Scroll or pinch to zoom in/out
- **Rotate**: Right-click and drag to rotate the view

The base map uses a light neutral style (CartoDB Positron) that keeps transit lines visually prominent.

## Transit Systems

Users can toggle the following transit systems on or off:

| System | Agency | Type | Default |
|--------|--------|------|---------|
| NYC Subway | MTA | Subway | Enabled |
| Long Island Rail Road | MTA | Rail | Disabled |
| Metro-North | MTA | Rail | Disabled |
| PATH | Port Authority | Subway | Disabled |
| NYC Ferry | NYC Ferry | Ferry | Disabled |
| NJ Transit Rail | NJ Transit | Rail | Disabled |

### System Selector

Located in the left sidebar under "TRANSIT SYSTEMS". Each system displays:

- A checkbox to enable/disable the system
- A colored dot indicating the system's brand color
- The system name

Toggling a system immediately updates the map to show or hide that system's routes and stations.

### Station Search

Located in the left sidebar above the system selector. The search feature allows users to find stations quickly:

**Input Field:**
- Type to search for stations by name
- Results appear as you type (fuzzy matching)
- Clear button (x) to reset the search

**Search Results:**
- Shows up to 10 matching stations
- Each result displays station name and transit system badge
- Keyboard navigation with arrow keys, Enter to select, Escape to close
- Clicking a result selects the station and zooms the map to its location

## Route Visualization

### Route Lines

Routes appear as colored lines on the map following their actual geographic paths. Line colors match official transit agency branding:

**NYC Subway:**
| Lines | Color | Name |
|-------|-------|------|
| A, C, E | Blue | Eighth Avenue |
| B, D, F, M | Orange | Sixth Avenue |
| G | Light Green | Crosstown |
| L | Gray | Canarsie |
| J, Z | Brown | Nassau Street |
| N, Q, R, W | Yellow | Broadway |
| 1, 2, 3 | Red | Broadway-Seventh Ave |
| 4, 5, 6 | Green | Lexington Avenue |
| 7 | Purple | Flushing |
| S | Gray | Shuttles |

**Commuter Rail & Regional:**
- LIRR branches use distinct colors per line (Babylon, Montauk, Port Jefferson, etc.)
- Metro-North lines use Hudson (green), Harlem (blue), New Haven (red) colors
- PATH uses red, green, yellow, blue per route
- NJ Transit Rail uses official line colors (NEC red, NJCL orange, etc.)

### Route Display Names

- **NYC Subway**: Shows single letter/number (A, 1, 7, etc.)
- **PATH**: Shows abbreviated names (NWK, JSQ, etc.)
- **LIRR**: Shows full branch names (Babylon Branch, Port Washington Branch, etc.)
- **Metro-North**: Shows line names (Hudson, Harlem, New Haven, etc.)
- **NJ Transit**: Shows line names (Northeast Corridor, North Jersey Coast, etc.)

### Route Tooltips

Hovering over a route displays a tooltip showing:
- Route name (branch name for rail systems, short name for subway)
- System name or route description

### Route Selection and Highlighting

**Hover Behavior:**
- Hovering over a route thickens the line slightly
- Other routes dim to emphasize the hovered route

**Selection Behavior:**
- Clicking a route selects it and opens the Route Detail Panel
- The selected route is highlighted with increased thickness and dark outline
- All other routes and stations are grayed out
- Selecting a route clears any station selection (and vice versa)
- The map automatically zooms to fit the selected route

**Click Detection:**
- Routes are clickable at all zoom levels
- An invisible wide hit area ensures reliable click detection

### Route Detail Panel

Clicking a route opens the detail panel on the right side of the map. The panel displays:

**Header:**
- Route badge with official color and name
- For rail systems: full branch/line name displayed prominently
- For subway: letter/number badge with long name below
- Close button (x) to dismiss the panel

**Route Info Section:**
- Transit system name
- Route type (Subway, Rail, Ferry)

**Stations Section:**
- List of all stations on the route in travel order
- Transfer stations marked with transfer indicator (arrows)
- Click a station to view its details and zoom to it

**Zoom Button:**
- "Zoom to Route" button centers and zooms the map to show the full route

### Parallel Route Display

Where multiple routes share the same track (common in commuter rail systems):
- Routes are displayed with parallel line offsets
- Each route is offset perpendicular to the track direction
- All overlapping routes are distinctly visible
- Offset distance is approximately 10 meters per route

## Station Visualization

### Station Markers

Stations appear as circular dots on the map:

- **Regular stations**: Small white circles with colored border
- **Transfer stations**: Larger white circles (stations serving multiple routes)
- **Hovered stations**: Highlighted in solid white
- **Selected route context**: Stations not on selected route are grayed out

The border color matches the primary route serving that station.

### Station Tooltips

Hovering over a station displays a tooltip showing:
- Station name
- List of routes serving the station
- Rail systems show branch names; subway shows line letters/numbers

Example: "Times Square-42 St | 1, 2, 3, 7, A, C, E"

### Station Detail Panel

Clicking a station opens the detail panel on the right side of the map. The panel displays:

**Header:**
- Station name (prominent heading)
- Close button (x) to dismiss the panel

**Routes Section:**
- Colored badges for each route serving the station
- Badge background matches the route's official color
- **Badges are clickable** - click to view route details
- Rail systems show branch names; subway shows line letters/numbers
- Multiple routes wrap to additional rows

**Transfer Station Section:** (if applicable)
- Indicates the station connects to other transit lines

**Accessibility Section:** (if data available)
- ADA Accessible: Yes/No
- Elevator: Yes/No

**Coordinates:**
- Latitude and longitude (for reference)

### Auto-Zoom Behavior

When selecting a station:
- Map automatically centers on the selected station
- Zoom level adjusts to show station context (minimum zoom 14)

When selecting a route:
- Map automatically zooms to fit the entire route
- All stations on the route are visible

## Data & Coverage

### Geographic Coverage

The map covers the NYC metropolitan transit network including:
- All five NYC boroughs
- Long Island (LIRR)
- Westchester and Connecticut (Metro-North)
- New Jersey (PATH, NJ Transit)

### Data Sources

Transit data is sourced from official GTFS (General Transit Feed Specification) feeds:
- MTA feeds for NYC Subway, LIRR, Metro-North
- Port Authority for PATH
- NYC Ferry for ferry routes
- NJ Transit for New Jersey rail

### Data Accuracy

- Route geometries follow actual track alignments
- Station locations are GPS-accurate
- Accessibility data reflects current ADA compliance status
- Station order in route panels reflects actual travel sequence

## Performance

### Loading Behavior

- NYC Subway loads by default on application start
- Other systems load on-demand when toggled on
- Previously loaded systems are cached for instant re-display

### Map Performance

- Routes and stations render efficiently using WebGL (Deck.gl)
- Large systems (thousands of stations) display smoothly
- Zoom-dependent detail levels optimize rendering

## Browser Support

The application requires a modern web browser with WebGL support:
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## Accessibility

- Keyboard navigation for UI controls
- Screen reader compatible labels
- High contrast between route colors and background
- Station accessibility information displayed when available
