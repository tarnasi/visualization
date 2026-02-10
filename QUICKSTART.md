# ⚡ Quick Start Guide - Drilling ROP Visualization

Get the system running in **under 5 minutes**!

## Prerequisites Check

```bash
# Verify Docker is installed
docker --version
docker-compose --version

# Check available ports
lsof -i :3000  # Should be empty
lsof -i :3001  # Should be empty
lsof -i :1883  # Should be empty
```

## 🚀 Step-by-Step Startup

### 1. Start All Services (2 minutes)

```bash
# Navigate to project directory
cd advanced-chart

# Start everything with Docker Compose
docker-compose up -d

# Wait for services to be healthy (~30 seconds)
watch -n 2 docker-compose ps
```

**Expected Output:**
```
NAME                  STATUS
drilling-backend      Up (healthy)
drilling-frontend     Up (healthy)
drilling-mongodb      Up (healthy)
drilling-mqtt         Up (healthy)
drilling-postgres     Up (healthy)
```

### 2. Initialize Database (30 seconds)

```bash
# Connect to PostgreSQL container
docker exec -it drilling-postgres psql -U postgres -d drilling_data

# Insert 10,000 sample records (depth 0-1000m, last 7 days)
SELECT insert_sample_data(0, 1000, NOW() - INTERVAL '7 days');
```

**Expected Output:**
```
NOTICE:  Inserting sample data from depth 0 to 1000 starting at 2024-02-04 12:00:00
NOTICE:  Sample data insertion complete
 insert_sample_data 
--------------------
 
```

```sql
# Verify data was inserted
SELECT COUNT(*) FROM drilling_rop_data;

# Exit PostgreSQL
\q
```

### 3. Open Dashboard (10 seconds)

```bash
# Open in your browser
open http://localhost:3000

# Or manually navigate to:
# http://localhost:3000
```

**You should see:**
- ✅ Green connection indicator (Real-time Connected)
- ✅ Data point counter showing ~10,000 points
- ✅ 3D Wellbore visualization with colored spheres

### 4. Test Real-Time Data (30 seconds)

```bash
# Publish a single test message
docker exec -it drilling-mqtt mosquitto_pub \
  -t plc/drilling/rop \
  -m '{"depth":500.5, "time":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "rop":15.75}'
```

**Watch the Dashboard:**
- Data point counter should increment
- New point appears in visualization
- Status stays green

### 5. Try All Features (2 minutes)

#### Switch Views
1. Click **"3D Chart"** tab - See time/ROP/depth scatter plot
2. Click **"2D Well Progress"** tab - See progress chart
3. Click **"3D Wellbore Path"** tab - Back to wellbore

#### Export Data
1. Click **📄 Export PDF** - Downloads PDF of current view
2. Click **📸 Export Image** - Downloads PNG screenshot

#### Check Backend Health
```bash
# View health status
curl http://localhost:3001/health | jq

# Should show all services as healthy
```

## 🎯 Continuous Data Stream (Optional)

### Simulate Real-Time PLC Data

```bash
# Run this script to publish data every second
while true; do
  DEPTH=$((RANDOM % 1000))
  ROP=$((RANDOM % 20 + 5))
  TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  
  docker exec -it drilling-mqtt mosquitto_pub \
    -t plc/drilling/rop \
    -m "{\"depth\":${DEPTH},\"time\":\"${TIME}\",\"rop\":${ROP}}"
  
  echo "Published: depth=${DEPTH}m, rop=${ROP}m/h"
  sleep 1
done
```

Watch the dashboard auto-update every second! ✨

## ✅ Verification Checklist

- [ ] All 5 Docker containers running and healthy
- [ ] PostgreSQL has data (`SELECT COUNT(*)` returns > 0)
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend API responds at http://localhost:3001/health
- [ ] Green connection indicator on dashboard
- [ ] Can switch between all 3 visualization views
- [ ] MQTT messages appear in real-time
- [ ] Can export PDF and PNG

## 🛑 Stop Everything

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (fresh start next time)
docker-compose down -v
```

## 🔄 Restart from Scratch

```bash
# Complete cleanup
docker-compose down -v
docker system prune -f

# Start again
docker-compose up -d
```

## 🐛 Quick Troubleshooting

### Problem: Services won't start

```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend

# Common fix: Rebuild containers
docker-compose up -d --build
```

### Problem: No data in dashboard

```bash
# 1. Check PostgreSQL has data
docker exec -it drilling-postgres psql -U postgres -d drilling_data -c "SELECT COUNT(*) FROM drilling_rop_data;"

# 2. Check backend can query data
curl "http://localhost:3001/api/data/historical?limit=10"

# 3. Check frontend can reach backend
curl http://localhost:3000/api/data/statistics
```

### Problem: MQTT not working

```bash
# Check broker is running
docker-compose ps mqtt

# Subscribe to see if messages are flowing
docker exec -it drilling-mqtt mosquitto_sub -t plc/drilling/rop -v

# In another terminal, publish a test
docker exec -it drilling-mqtt mosquitto_pub -t plc/drilling/rop -m '{"depth":100,"time":"2024-02-11T12:00:00Z","rop":10}'
```

### Problem: Export buttons don't work

```bash
# Check backend PDF service
curl http://localhost:3001/api/pdf/status

# View backend logs for Puppeteer errors
docker-compose logs backend | grep -i puppeteer
```

## 📚 Next Steps

- **Read Full Documentation**: See `README.md`
- **Customize MQTT Topic**: Edit `backend/.env`
- **Add More Data**: Run `SELECT insert_sample_data(1000, 3000, NOW())`
- **Connect Real PLC**: Configure MQTT broker URL in `.env`
- **Deploy to Production**: See deployment guide

## 💡 Tips

1. **Performance**: For best performance, keep realtime data under 1000 points
2. **Data Refresh**: Click refresh button to reload from database
3. **3D Controls**: Use mouse to rotate (left), pan (right), zoom (scroll)
4. **Mobile**: Works on mobile browsers but 3D views work best on desktop

## 🎉 Success!

You now have a fully functional drilling ROP visualization system!

**What's happening:**
- 📊 PostgreSQL storing 10,000+ historical drilling records
- 📡 MQTT broker ready to receive PLC data at 1Hz
- 🔌 WebSocket server broadcasting real-time updates
- 🎨 React frontend rendering 3D/2D visualizations
- 📄 PDF service ready to generate reports

**Need help?** Check the full README.md or create an issue on GitHub.
