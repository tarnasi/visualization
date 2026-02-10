# Drilling ROP Visualization - Frontend

Complete frontend implementation for the Drilling ROP (Rate of Penetration) visualization system.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── WellborePathVisualization.jsx   # 3D vertical wellbore path
│   │   ├── Chart3DVisualization.jsx        # 3D scatter plot (Time/ROP/Depth)
│   │   └── WellProgressChart.jsx           # 2D progress chart (D3.js)
│   ├── hooks/
│   │   └── useWebSocket.js                 # WebSocket connection hook
│   ├── store/
│   │   └── dataStore.js                    # Zustand state management
│   ├── services/
│   │   └── api.js                          # API service (Axios)
│   ├── App.jsx                             # Main dashboard component
│   ├── App.css                             # Dark theme styling
│   ├── index.css                           # Global styles
│   └── main.tsx                            # React entry point
├── public/
├── index.html                              # HTML template
├── vite.config.ts                          # Vite configuration
├── nginx.conf                              # Nginx configuration for production
├── .env.example                            # Environment variables template
└── package.json                            # Dependencies

```

## 🎨 Implemented Features

### 1. **3D Wellbore Path Visualization**
- Vertical line representing the wellbore going downward (z-axis = -depth)
- Color-coded spheres based on ROP values:
  - Blue (low ROP) → Green (medium) → Red (high ROP)  
- Depth markers displayed as text labels
- Interactive OrbitControls for camera manipulation
- Color legend showing ROP gradient scale

### 2. **3D Chart Visualization**
- 3D scatter plot with Three.js
- Axes:
  - X-axis (Red): Time (normalized 0-40)
  - Y-axis (Green): ROP (normalized 0-40)
  - Z-axis (Blue): Depth (normalized 0-40, negative)
- Color-coded points with connecting line
- Axis tick labels and grid helper
- Interactive camera controls

### 3. **2D Well Progress Chart**
- D3.js SVG-based chart
- Planned progress line (green, dashed)
- Actual progress line (blue, solid, curved)
- "Today" marker (red, dashed vertical line)
- Inverted depth axis (0 at top)
- Rotated date labels for readability
- Interactive legend

### 4. **Real-time Data Streaming**
- WebSocket connection to backend
- Auto-reconnect on disconnect (3-second delay)
- Combines historical + real-time data
- Keeps last 1000 real-time points

### 5. **State Management**
- Zustand store for global state
- Historical and real-time data separation
- Data filtering by date and depth range
- Combined data getter functions

### 6. **Export Functionality**
- Export to PDF (A4 landscape)
- Export to PNG screenshot
- Captures current visualization
- Downloads with timestamp in filename

### 7. **Dashboard UI**
- Dark theme (#0a0a0a background)
- Gradient header with branding
- Connection status indicator (green/red)
- Data point counter
- Tab navigation for switching views
- Control buttons for refresh and export
- Responsive design for mobile

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend server running on port 3001
- MQTT broker (optional, for real-time data)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
# Starts on http://localhost:3000
```

### Build for Production

```bash
npm run build
# Output in dist/ folder
```

### Preview Production Build

```bash
npm run preview
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` if needed:
```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
VITE_DEV_MODE=true
```

### Vite Proxy Setup
The `vite.config.ts` automatically proxies:
- `/api/*` → `http://localhost:3001/api/*`
- `/ws` → `ws://localhost:3001/ws` (WebSocket)

## 📊 Data Format

Expected data structure from backend:

```javascript
{
  depth: 1234.56,              // meters (number)
  time: "2024-02-10T12:30:45Z",  // ISO 8601 timestamp (string)
  rop: 15.75                   // meters/hour (number)
}
```

## 🎨 Color Gradient Formula

ROP values are color-coded using this algorithm:

```javascript
normalized = (rop - minROP) / (maxROP - minROP)

if (normalized < 0.5):
  RGB(0, normalized*2, 1-normalized*2)  // Blue to Green
else:
  RGB((normalized-0.5)*2, 1-(normalized-0.5)*2, 0)  // Green to Red
```

## 🧪 Testing

### Test Real-time Data

With backend running, publish MQTT data:

```bash
mosquitto_pub -h localhost -t plc/drilling/rop -m '{
  "depth": 100.5,
  "time": "2024-02-10T12:00:00Z",
  "rop": 12.5
}'
```

### Test API Endpoints

```bash
# Get historical data
curl http://localhost:3001/api/data/historical?limit=100

# Get statistics
curl http://localhost:3001/api/data/statistics
```

## 📦 Dependencies

### Core
- **React 19**: UI framework
- **Vite**: Build tool and dev server

### 3D Visualization
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Helper components for Three.js
- **three**: 3D graphics library

### 2D Visualization
- **d3**: SVG-based charting and data visualization

### State & Data
- **zustand**: Lightweight state management
- **axios**: HTTP client for API calls

## 🐛 Troubleshooting

### WebSocket not connecting
- Ensure backend is running on port 3001
- Check WebSocket server is enabled in backend
- Verify proxy settings in `vite.config.ts`

### No data displayed
- Check backend database has records
- Verify API endpoint: `http://localhost:3001/api/data/historical`
- Look for errors in browser console

### Export not working
- Ensure backend is running (uses Puppeteer)
- Check PDF/screenshot endpoints are available
- Verify sufficient memory for Puppeteer

### 3D visualizations blank
- Check browser WebGL support
- Open browser console for Three.js errors
- Ensure data has valid depth/time/rop values

## 🎯 Usage Tips

1. **Navigation**: Click tabs to switch between 3D Wellbore, 3D Chart, and 2D Progress views
2. **3D Controls**: 
   - Left mouse: Rotate
   - Right mouse: Pan
   - Scroll: Zoom
3. **Refresh Data**: Click "Refresh Data" to reload historical data from backend
4. **Export**: Use "Export PDF" or "Export Image" to save current visualization
5. **Real-time**: WebSocket automatically receives and displays new data points

## 📝 Notes

- All Three.js visualizations use `@react-three/fiber` Canvas wrapper
- D3.js chart is pure SVG (no canvas)
- WebSocket auto-reconnect is mandatory (enabled)
- Export functions capture current visualization HTML
- All visualizations handle empty data gracefully
- Data is limited to 5000 historical + 1000 real-time points for performance

## 🔗 API Integration

### Data API
- `GET /api/data/historical?limit=5000` - Fetch historical data
- `GET /api/data/statistics` - Get data statistics
- `GET /api/data/depth-intervals` - Get depth interval data

### PDF API
- `POST /api/pdf/generate` - Generate PDF from HTML
- `POST /api/pdf/screenshot` - Capture screenshot from HTML

## 🎨 Styling

- **Dark Theme**: Professional oil & gas industry aesthetic
- **Responsive**: Works on desktop, tablet, and mobile
- **Animations**: Smooth transitions and status indicators
- **Gradients**: Blue-cyan branding throughout
- **Accessibility**: Focus states and proper contrast ratios

## 📄 License

Part of the Drilling ROP Visualization System project.
