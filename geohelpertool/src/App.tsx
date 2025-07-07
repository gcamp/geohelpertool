import { useRef, useState } from 'react'
import MapComponent, { type MapComponentRef } from './components/MapComponent'
import Sidebar from './components/Sidebar'
import { LayerProvider } from './contexts/LayerContext'
import NotificationContainer from './components/NotificationContainer'
import './App.css'

function App() {
  const mapComponentRef = useRef<MapComponentRef>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  const handleFitToLayers = () => {
    mapComponentRef.current?.fitMapToLayers();
  };

  return (
    <NotificationContainer>
      <LayerProvider>
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
          <MapComponent ref={mapComponentRef} sidebarVisible={true} sidebarWidth={sidebarWidth} />
          <Sidebar onFitToLayers={handleFitToLayers} onWidthChange={setSidebarWidth} />
        </div>
      </LayerProvider>
    </NotificationContainer>
  )
}

export default App
