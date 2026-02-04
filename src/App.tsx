import { TransitMap } from '@/components/Map/TransitMap';
import { SystemSelector } from '@/components/Panels/SystemSelector';
import { SearchPanel } from '@/components/Panels/SearchPanel';
import { StationDetailPanel } from '@/components/Panels/StationDetailPanel';
import { RouteDetailPanel } from '@/components/Panels/RouteDetailPanel';
import { Sidebar } from '@/components/UI/Sidebar';
import { Legend } from '@/components/UI/Legend';
import { HeatmapControls } from '@/components/UI/HeatmapControls';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>NYC Transit Network Explorer</h1>
      </header>
      <main className="app-main">
        <Sidebar>
          <SearchPanel />
          <SystemSelector />
          <HeatmapControls />
        </Sidebar>
        <div className="map-container">
          <TransitMap />
          <Legend />
        </div>
        <StationDetailPanel />
        <RouteDetailPanel />
      </main>
    </div>
  );
}

export default App;
