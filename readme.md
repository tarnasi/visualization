# Drilling ROP Visualization System

A comprehensive full-stack web application for visualizing oil & gas drilling data with real-time MQTT data streaming from PLC systems, interactive 3D/2D visualizations, and PDF export capabilities.

## 🎯 Features

### Real-Time Data Streaming
- **MQTT Integration**: Connects to PLC/SCADA systems via MQTT broker
- **WebSocket Broadcasting**: Live data pushed to all connected clients
- **Auto-Reconnection**: Resilient connection handling with automatic recovery
- **Data Rate**: Supports 1Hz (1 sample/second) streaming

### Interactive Visualizations
- **3D Wellbore Path**: Vertical wellbore representation with color-coded ROP values
- **3D Scatter Plot**: Time/ROP/Depth correlation in 3D space
- **2D Progress Chart**: Planned vs actual drilling progress with D3.js
- **Dynamic Color Coding**: Blue→Green→Red gradient based on ROP values

### Data Management
- **PostgreSQL**: Historical data storage and querying
- **MongoDB**: Flexible document storage for drill logs
- **Advanced Filtering**: Date range, depth range, and custom queries
- **Pagination**: Efficient data loading for large datasets

### Export Capabilities
- **PDF Generation**: High-quality PDF reports using Puppeteer
- **Screenshot Capture**: PNG exports of visualizations
- **Multi-Page Reports**: Combined visualization reports

## 🏗️ Architecture

```
┌─────────────┐      MQTT      ┌──────────────┐
│   PLC/SCADA │ ────────────→  │ MQTT Broker  │
└─────────────┘                └──────┬───────┘
                                      │
                                      ↓
┌──────────────────────────────────────────────────┐
│              Backend (Node.js)                    │
│  ┌─────────────┐  ┌──────────────┐              │
│  │ MQTT Service│→ │WebSocket Svc │ ────┐        │
│  └─────────────┘  └──────────────┘     │        │
│  ┌─────────────┐  ┌──────────────┐     │        │
│  │PostgreSQL DB│  │  MongoDB DB  │     │        │
│  └─────────────┘  └──────────────┘     │        │
│  ┌─────────────────────────────────┐   │        │
│  │   PDF Service (Puppeteer)       │   │        │
│  └─────────────────────────────────┘   │        │
└───────────────────────────────────────┼─────────┘
                                        │
                                   WebSocket
                                        │
┌───────────────────────────────────────┼─────────┐
│            Frontend (React)           ↓         │
│  ┌────────────────────────────────────────┐    │
│  │  Dashboard (Zustand State Management)  │    │
│  └────────────────────────────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │3D Wellbore│ │3D Chart  │ │2D Progress   │   │
│  │(Three.js) │ │(Three.js)│ │(D3.js)       │   │
│  └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────┘
```

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Databases**: PostgreSQL 15, MongoDB 7
- **MQTT**: mqtt.js v5.3.5+
- **WebSocket**: ws library
- **PDF Generation**: Puppeteer + PDFKit
- **Container**: Docker with Alpine Linux

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **3D Graphics**: Three.js with @react-three/fiber
- **2D Charts**: D3.js v7
- **State**: Zustand
- **HTTP Client**: Axios
- **Server**: Nginx (production)

### Infrastructure
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx
- **MQTT Broker**: Eclipse Mosquitto 2

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 3000, 3001, 5432, 27017, 1883 available

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd advanced-chart

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Update MQTT connection details in backend/.env if needed
nano backend/.env
```

### 2. Start All Services

```bash
# Start all containers (first time will build images)
docker-compose up -d

# Check all services are healthy
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Initialize Database with Sample Data

```bash
# Connect to PostgreSQL
docker exec -it drilling-postgres psql -U postgres -d drilling_data

# Insert 10,000 sample records from the last 7 days
SELECT insert_sample_data(0, 1000, NOW() - INTERVAL '7 days');

# Verify data
SELECT COUNT(*) FROM drilling_rop_data;
SELECT * FROM drilling_rop_data ORDER BY timestamp DESC LIMIT 10;

# Exit
\q
```

### 4. Test MQTT Real-Time Data

```bash
# Publish a test message to MQTT
docker exec -it drilling-mqtt mosquitto_pub \
  -t plc/drilling/rop \
  -m '{"depth":250.5,"time":"2024-02-11T12:30:00Z","rop":18.75}'

# Subscribe to see messages (in another terminal)
docker exec -it drilling-mqtt mosquitto_sub \
  -t plc/drilling/rop -v
```

### 5. Access Applications

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health
- **MQTT Broker**: mqtt://localhost:1883

## 📊 Data Format

### MQTT Message Format
Messages should be published to the configured topic (default: `plc/drilling/rop`) in JSON format:

```json
{
  "depth": 1234.56,
  "time": "2024-02-11T12:30:45Z",
  "rop": 15.75
}
```

**Fields:**
- `depth`: Current depth in meters (number, ≥ 0)
- `time`: ISO 8601 timestamp (string)
- `rop`: Rate of Penetration in meters/hour (number, ≥ 0)

**Publishing Rate**: Recommended 1 Hz (1 message per second)

## 🔧 Configuration

### Backend Environment Variables

See `backend/.env.example` for all available options:

```env
# Key configurations:
MQTT_BROKER=mqtt://mqtt:1883
MQTT_TOPIC=plc/drilling/rop
STORE_MQTT_DATA=true  # Save MQTT data to PostgreSQL
PORT=3001
```

### Frontend Environment Variables

See `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

## 📡 API Endpoints

### Data Endpoints

```bash
# Get historical data
GET /api/data/historical?limit=5000&startDate=2024-01-01&endDate=2024-12-31

# Get statistics
GET /api/data/statistics

# Get depth intervals
GET /api/data/depth-intervals?intervalSize=10

# Insert data (testing)
POST /api/data/insert
```

### PDF Endpoints

```bash
# Generate PDF from HTML
POST /api/pdf/generate
Body: { html: "<html>...</html>", options: {...} }

# Capture screenshot
POST /api/pdf/screenshot
Body: { html: "<html>...</html>", options: {...} }

# Combined report
POST /api/pdf/generate/combined
Body: { visualizations: [...], metadata: {...} }
```

## 🧪 Testing

### Run with Development Mode

```bash
# Backend only
cd backend
npm install
npm run dev

# Frontend only
cd frontend
npm install
npm run dev
```

### Insert Test Data

```sql
-- Small test dataset (100 records)
SELECT insert_sample_data(0, 10, NOW() - INTERVAL '1 hour');

-- Medium test dataset (10,000 records)
SELECT insert_sample_data(0, 1000, NOW() - INTERVAL '7 days');

-- Large test dataset (30,000 records)
SELECT insert_sample_data(0, 3000, NOW() - INTERVAL '30 days');
```

### Publish Test MQTT Messages

```bash
# Single message
mosquitto_pub -h localhost -t plc/drilling/rop \
  -m '{"depth":100,"time":"2024-02-11T10:00:00Z","rop":12.5}'

# Multiple messages with script
for i in {1..10}; do
  mosquitto_pub -h localhost -t plc/drilling/rop \
    -m "{\"depth\":$((i * 10)),\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"rop\":$((RANDOM % 20 + 5))}"
  sleep 1
done
```

## 📋 Usage Guide

### Dashboard Navigation
1. **Connection Status**: Top-right indicator shows real-time connection (green = connected)
2. **View Tabs**: Switch between 3D Wellbore, 3D Chart, and 2D Progress
3. **Controls**: 
   - 🔄 Refresh Data: Reload historical data
   - 📄 Export PDF: Download current view as PDF
   - 📸 Export Image: Save screenshot

### 3D Visualization Controls
- **Left Click + Drag**: Rotate view
- **Right Click + Drag**: Pan view
- **Scroll**: Zoom in/out
- **Double Click**: Reset camera

### Understanding Color Coding
- **Blue**: Low ROP (slower drilling)
- **Green**: Medium ROP (normal drilling)
- **Red**: High ROP (faster drilling)

## 🛠️ Development

### Project Structure

```
advanced-chart/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── postgres.js
│   │   │   └── mongodb.js
│   │   ├── services/
│   │   │   ├── mqttService.js
│   │   │   ├── websocketService.js
│   │   │   └── pdfService.js
│   │   ├── routes/
│   │   │   ├── dataRoutes.js
│   │   │   └── pdfRoutes.js
│   │   └── server.js
│   ├── schema.sql
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── App.jsx
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── mqtt/
│   └── mosquitto.conf
└── docker-compose.yml
```

### Adding New Visualizations

1. Create component in `frontend/src/components/`
2. Add state in `dataStore.js` if needed
3. Import and add to `App.jsx` dashboard
4. Update navigation tabs

### Customizing MQTT Topics

1. Update `MQTT_TOPIC` in `backend/.env`
2. Restart backend container
3. Publish to new topic

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - PostgreSQL not ready: Wait 30s and retry
# - MQTT connection failed: Check broker is running
# - Port already in use: Change PORT in .env
```

### No real-time data
```bash
# Check MQTT broker
docker-compose logs mqtt

# Test MQTT connection
mosquitto_sub -h localhost -t plc/drilling/rop -v

# Check backend MQTT status
curl http://localhost:3001/health | jq '.mqttInfo'
```

### Frontend not loading
```bash
# Check nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend

# Check API proxy
curl http://localhost:3000/api/data/statistics
```

### Database connection errors
```bash
# Reset PostgreSQL
docker-compose down
docker volume rm drilling_postgres_data
docker-compose up -d postgres

# Wait for healthy status
docker-compose ps

# Re-run schema
docker exec -it drilling-postgres psql -U postgres -d drilling_data -f /schema.sql
```

## 🔒 Security Considerations

⚠️ **This configuration is for development/testing**

For production:
- Enable MQTT authentication
- Use TLS/SSL for all connections
- Implement API authentication (JWT)
- Configure firewall rules
- Use secrets management
- Enable PostgreSQL/MongoDB authentication
- Set up proper CORS origins
- Use environment-specific configs

## 📝 License

[Your License Here]

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines first.

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check documentation in `/docs`
- Review troubleshooting section above

## 🙏 Acknowledgments

Built for oil & gas drilling operations visualization and monitoring.
