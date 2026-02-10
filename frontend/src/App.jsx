import { useState, useEffect, useCallback } from 'react';
import './App.css';
import WellborePathVisualization from './components/WellborePathVisualization';
import Chart3DVisualization from './components/Chart3DVisualization';
import WellProgressChart from './components/WellProgressChart';
import useWebSocket from './hooks/useWebSocket';
import useDataStore from './store/dataStore';
import { dataAPI, pdfAPI } from './services/api';

function App() {
  const [activeView, setActiveView] = useState('wellbore');
  const [exporting, setExporting] = useState(false);
  
  const {
    historicalData,
    realtimeData,
    setHistoricalData,
    addRealtimeData,
    getCombinedData,
    getDataCount,
    setLoadingHistorical,
    setError
  } = useDataStore();
  
  // WebSocket connection for real-time data
  const { isConnected, error: wsError } = useWebSocket(
    'ws://localhost:3001',
    useCallback((data) => {
      // Handle incoming WebSocket data
      if (data && data.depth !== undefined && data.rop !== undefined) {
        addRealtimeData(data);
      }
    }, [addRealtimeData])
  );
  
  // Load historical data on mount
  useEffect(() => {
    loadHistoricalData();
  }, []);
  
  const loadHistoricalData = async () => {
    try {
      setLoadingHistorical(true);
      setError(null);
      const data = await dataAPI.getHistoricalData({ limit: 5000 });
      setHistoricalData(data);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setError(error.message);
    } finally {
      setLoadingHistorical(false);
    }
  };
  
  const handleRefreshData = () => {
    loadHistoricalData();
  };
  
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      // Get the current visualization element
      const vizElement = document.getElementById('current-visualization');
      if (!vizElement) {
        alert('No visualization to export');
        return;
      }
      
      // Create a wrapper with better styling for PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: white;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .header h1 {
                color: #1a1a2e;
                margin: 0;
              }
              .header p {
                color: #666;
                margin: 5px 0;
              }
              .content {
                width: 100%;
                height: 800px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Drilling ROP Visualization Report</h1>
              <p>Generated on ${new Date().toLocaleString()}</p>
              <p>Total Data Points: ${getDataCount()}</p>
            </div>
            <div class="content">
              ${vizElement.innerHTML}
            </div>
          </body>
        </html>
      `;
      
      const blob = await pdfAPI.generatePDFFromHTML(htmlContent, {
        format: 'A4',
        landscape: true
      });
      
      const filename = `drilling-rop-${activeView}-${Date.now()}.pdf`;
      pdfAPI.downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Make sure the backend is running.');
    } finally {
      setExporting(false);
    }
  };
  
  const handleExportImage = async () => {
    try {
      setExporting(true);
      
      // Get the current visualization element
      const vizElement = document.getElementById('current-visualization');
      if (!vizElement) {
        alert('No visualization to export');
        return;
      }
      
      // Create HTML content for screenshot
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: #0a0a0a;
                color: white;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .content {
                width: 100%;
                height: 800px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Drilling ROP Visualization</h1>
              <p>${new Date().toLocaleString()}</p>
            </div>
            <div class="content">
              ${vizElement.innerHTML}
            </div>
          </body>
        </html>
      `;
      
      const blob = await pdfAPI.captureScreenshot(htmlContent, {
        type: 'png',
        quality: 90
      });
      
      const filename = `drilling-rop-${activeView}-${Date.now()}.png`;
      pdfAPI.downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image. Make sure the backend is running.');
    } finally {
      setExporting(false);
    }
  };
  
  const combinedData = getCombinedData();
  const dataCount = getDataCount();
  
  // Mock data for well progress chart
  const wellProgressData = {
    plannedStartDate: '2024-01-01T00:00:00Z',
    plannedEndDate: '2024-12-31T23:59:59Z',
    targetDepth: Math.max(...(combinedData.map(d => d.depth) || [1000]))
  };
  
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>Drilling ROP Visualization System</h1>
          <div className="header-info">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="data-counter">
              <span>Data Points: {dataCount}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="navigation">
        <button
          className={`nav-button ${activeView === 'wellbore' ? 'active' : ''}`}
          onClick={() => setActiveView('wellbore')}
        >
          3D Wellbore Path
        </button>
        <button
          className={`nav-button ${activeView === '3dchart' ? 'active' : ''}`}
          onClick={() => setActiveView('3dchart')}
        >
          3D Chart
        </button>
        <button
          className={`nav-button ${activeView === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveView('progress')}
        >
          2D Well Progress
        </button>
      </nav>
      
      {/* Controls */}
      <div className="controls">
        <button
          className="control-button"
          onClick={handleRefreshData}
          disabled={exporting}
        >
          🔄 Refresh Data
        </button>
        <button
          className="control-button"
          onClick={handleExportPDF}
          disabled={exporting}
        >
          📄 Export PDF
        </button>
        <button
          className="control-button"
          onClick={handleExportImage}
          disabled={exporting}
        >
          📷 Export Image
        </button>
      </div>
      
      {/* Error Display */}
      {(wsError || useDataStore.getState().error) && (
        <div className="error-banner">
          ⚠️ {wsError || useDataStore.getState().error}
        </div>
      )}
      
      {/* Visualization Container */}
      <div className="visualization-container" id="current-visualization">
        {combinedData.length === 0 ? (
          <div className="no-data">
            <h2>No Data Available</h2>
            <p>Waiting for data from MQTT or database...</p>
            <p>Try publishing test data or check backend connection.</p>
          </div>
        ) : (
          <>
            {activeView === 'wellbore' && (
              <WellborePathVisualization data={combinedData} />
            )}
            {activeView === '3dchart' && (
              <Chart3DVisualization data={combinedData} />
            )}
            {activeView === 'progress' && (
              <WellProgressChart
                plannedStartDate={wellProgressData.plannedStartDate}
                plannedEndDate={wellProgressData.plannedEndDate}
                targetDepth={wellProgressData.targetDepth}
                actualData={combinedData}
              />
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <footer className="footer">
        <p>Drilling ROP Visualization System © 2024 | Real-time Data Monitoring</p>
      </footer>
    </div>
  );
}

export default App;
