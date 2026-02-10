# 📡 MQTT Connection Guide

This guide helps you connect the backend to your PLC/SCADA MQTT broker for real-time drilling data.

## 🎯 Overview

The system subscribes to an MQTT topic where your PLC publishes drilling ROP data. The backend automatically:
1. Connects to the MQTT broker
2. Subscribes to the configured topic
3. Receives and validates messages
4. Broadcasts data via WebSocket to frontend
5. Optionally stores data in PostgreSQL

## ⚙️ Configuration

### Step 1: Get MQTT Broker Details

You need from your PLC/SCADA team:

```
✓ MQTT Broker URL (e.g., mqtt://192.168.1.100:1883)
✓ Topic Name (e.g., plc/drilling/rop or site/well001/data)
✓ Authentication (if required):
  - Username
  - Password
  - Client certificates (if using TLS)
```

### Step 2: Update Backend Environment

Edit `backend/.env`:

```env
# MQTT Broker Connection
MQTT_BROKER=mqtt://YOUR_BROKER_IP:1883
# For TLS: mqtts://YOUR_BROKER_IP:8883

# Topic to subscribe to
MQTT_TOPIC=plc/drilling/rop

# Store real-time data to database (true/false)
STORE_MQTT_DATA=true
```

### Step 3: Add Authentication (if needed)

If your broker requires authentication, update `backend/src/services/mqttService.js`:

```javascript
// In the config object, add:
const config = {
  broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  topic: process.env.MQTT_TOPIC || 'plc/drilling/rop',
  clientId: `drilling_backend_${Math.random().toString(16).slice(2, 8)}`,
  options: {
    clean: true,
    connectTimeout: 4000,
    keepalive: 60,
    reconnectPeriod: 3000,
    // Add authentication
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
};
```

Add to `backend/.env`:
```env
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

### Step 4: TLS/SSL Configuration (if needed)

For secure connections (mqtts://):

```javascript
// Add to mqttService.js config.options:
const fs = require('fs');

options: {
  // ... existing options
  ca: fs.readFileSync('./certs/ca.crt'),
  cert: fs.readFileSync('./certs/client.crt'),
  key: fs.readFileSync('./certs/client.key'),
  rejectUnauthorized: true
}
```

## 📋 Data Format Requirements

Your PLC must publish JSON messages in this exact format:

```json
{
  "depth": 1234.56,
  "time": "2024-02-11T12:30:45Z",
  "rop": 15.75
}
```

### Field Specifications

| Field  | Type   | Unit    | Description                          | Required | Validation        |
|--------|--------|---------|--------------------------------------|----------|-------------------|
| depth  | number | meters  | Current drilling depth               | Yes      | Must be ≥ 0       |
| time   | string | ISO8601 | Timestamp of measurement             | Yes      | Valid ISO format  |
| rop    | number | m/hr    | Rate of Penetration (drilling speed) | Yes      | Must be ≥ 0       |

### Example Messages

**Valid Messages:**
```json
{"depth": 0, "time": "2024-02-11T08:00:00Z", "rop": 0}
{"depth": 500.25, "time": "2024-02-11T12:30:45.123Z", "rop": 18.5}
{"depth": 2500.00, "time": "2024-02-11T18:45:30Z", "rop": 12.75}
```

**Invalid Messages (will be rejected):**
```json
{"depth": "500", "time": "2024-02-11", "rop": 18.5}  // depth as string, invalid time
{"depth": 500, "rop": 18.5}                          // missing time field
{"depth": -10, "time": "2024-02-11T12:00:00Z", "rop": 18.5}  // negative depth
```

## 🧪 Testing MQTT Connection

### Test 1: Check Broker Accessibility

```bash
# Ping the broker (if ICMP enabled)
ping YOUR_BROKER_IP

# Test MQTT connection with mosquitto_sub
mosquitto_sub -h YOUR_BROKER_IP -p 1883 -t plc/drilling/rop -v

# With authentication
mosquitto_sub -h YOUR_BROKER_IP -p 1883 -t plc/drilling/rop \
  -u USERNAME -P PASSWORD -v
```

### Test 2: Publish Test Message

```bash
# Local broker
mosquitto_pub -h YOUR_BROKER_IP -t plc/drilling/rop \
  -m '{"depth":100.5,"time":"2024-02-11T12:00:00Z","rop":12.5}'

# With authentication
mosquitto_pub -h YOUR_BROKER_IP -t plc/drilling/rop \
  -u USERNAME -P PASSWORD \
  -m '{"depth":100.5,"time":"2024-02-11T12:00:00Z","rop":12.5}'
```

### Test 3: Verify Backend Connection

```bash
# Start backend
docker-compose up backend

# Check logs for MQTT connection
docker-compose logs -f backend | grep -i mqtt
```

**Expected Log Output:**
```
Connecting to MQTT broker: mqtt://YOUR_BROKER_IP:1883
  Client ID: drilling_backend_a1b2c3
  Topic: plc/drilling/rop
✓ MQTT broker connected
✓ Subscribed to topic: plc/drilling/rop
```

### Test 4: End-to-End Verification

```bash
# 1. Check backend health
curl http://localhost:3001/health | jq '.mqttInfo'

# Should return:
{
  "connected": true,
  "broker": "mqtt://YOUR_BROKER_IP:1883",
  "topic": "plc/drilling/rop",
  "subscribers": 1
}

# 2. Publish a message
mosquitto_pub -h YOUR_BROKER_IP -t plc/drilling/rop \
  -m '{"depth":250,"time":"2024-02-11T15:00:00Z","rop":16.5}'

# 3. Check backend logs
docker-compose logs backend | tail -20
# Should show: MQTT message received on plc/drilling/rop

# 4. Check frontend dashboard
# Open http://localhost:3000
# Watch data point counter increment
```

## 🔧 Configuration Examples

### Example 1: Local Development

```env
# Local mosquitto broker (from docker-compose)
MQTT_BROKER=mqtt://mqtt:1883
MQTT_TOPIC=plc/drilling/rop
STORE_MQTT_DATA=true
```

### Example 2: Remote PLC Broker (No Auth)

```env
# Remote broker on local network
MQTT_BROKER=mqtt://192.168.10.50:1883
MQTT_TOPIC=scada/well001/rop
STORE_MQTT_DATA=true
```

### Example 3: Cloud Broker with Auth

```env
# HiveMQ Cloud or similar
MQTT_BROKER=mqtts://your-cluster.hivemq.cloud:8883
MQTT_TOPIC=drilling/well-a/rop
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_secure_password
STORE_MQTT_DATA=true
```

### Example 4: Multiple Topics

To subscribe to multiple topics, modify `mqttService.js`:

```javascript
const topics = [
  'plc/drilling/rop',
  'plc/drilling/torque',
  'plc/drilling/pressure'
];

client.on('connect', () => {
  topics.forEach(topic => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`✓ Subscribed to topic: ${topic}`);
      }
    });
  });
});
```

## 🐛 Troubleshooting

### Issue: "MQTT connection timeout"

**Possible Causes:**
1. Broker URL incorrect
2. Firewall blocking port 1883/8883
3. Broker not running

**Solutions:**
```bash
# Check broker is reachable
telnet YOUR_BROKER_IP 1883

# Check firewall
sudo ufw status
sudo ufw allow 1883/tcp

# Verify broker is running
# On the broker machine:
netstat -tulpn | grep 1883
```

### Issue: "MQTT subscription failed"

**Possible Causes:**
1. Invalid topic name
2. Insufficient permissions (ACL)
3. Authentication required but not provided

**Solutions:**
```bash
# Test with mosquitto_sub
mosquitto_sub -h YOUR_BROKER_IP -t 'plc/drilling/rop' -v -d

# Check broker ACL configuration
# In mosquitto.conf:
allow_anonymous true
# Or configure ACL file
```

### Issue: "Invalid MQTT message format"

**Backend logs show:**
```
Invalid MQTT message format: { depth: '100', time: ... }
```

**Solution:**
Ensure PLC publishes correct JSON format:
```json
// ✓ Correct
{"depth": 100.5, "time": "2024-02-11T12:00:00Z", "rop": 12.5}

// ✗ Wrong - strings instead of numbers
{"depth": "100.5", "time": "2024-02-11T12:00:00Z", "rop": "12.5"}
```

### Issue: Messages received but not in frontend

**Debugging Steps:**
```bash
# 1. Check backend receives messages
docker-compose logs backend | grep "MQTT message received"

# 2. Check WebSocket is broadcasting
docker-compose logs backend | grep "Broadcasted"

# 3. Check frontend WebSocket connection
# Open browser console (F12)
# Look for WebSocket connection messages

# 4. Check browser network tab
# Should see WebSocket connection to ws://localhost:3001
```

## 📊 Data Rate Recommendations

| Scenario                  | Rate    | Total/Day | Recommendation           |
|---------------------------|---------|-----------|--------------------------|
| Real-time monitoring      | 1 Hz    | 86,400    | ✅ Optimal               |
| High-frequency logging    | 10 Hz   | 864,000   | ⚠️  High DB load         |
| Standard drilling ops     | 0.5 Hz  | 43,200    | ✅ Good balance          |
| Historical analysis only  | 0.1 Hz  | 8,640     | ✅ Minimal overhead      |

**Recommendation:** 1 Hz (1 message/second) provides good real-time feel without overwhelming the database.

## 🔒 Security Best Practices

1. **Use TLS for production**: `mqtts://` instead of `mqtt://`
2. **Enable authentication**: Don't allow anonymous connections
3. **Restrict topic access**: Use ACL to limit topic permissions
4. **Use strong passwords**: For MQTT username/password
5. **Firewall rules**: Only allow necessary IPs to access broker
6. **Monitor connections**: Log all MQTT connections
7. **Rotate credentials**: Change passwords regularly

## 📝 PLC Integration Checklist

- [ ] MQTT broker URL confirmed and accessible
- [ ] Topic name agreed upon
- [ ] Data format validated (JSON with depth, time, rop)
- [ ] Publishing rate configured (recommended: 1 Hz)
- [ ] Authentication credentials (if required)
- [ ] TLS certificates (if using mqtts://)
- [ ] Test messages successfully received
- [ ] Backend logs show successful connection
- [ ] Frontend dashboard shows real-time updates
- [ ] Data being stored to PostgreSQL (if enabled)

## 🎯 Next Steps

After successful MQTT connection:

1. **Monitor Data Flow**: Watch dashboard for continuous updates
2. **Verify Data Storage**: Check PostgreSQL has incoming data
3. **Set Up Alerts**: Configure alerts for connection drops
4. **Performance Tuning**: Adjust buffer sizes if needed
5. **Documentation**: Document your PLC-specific configuration

## 📞 Support

If you encounter issues connecting to your PLC MQTT broker:

1. Capture MQTT connection logs
2. Test with mosquitto_sub/pub first
3. Verify JSON message format
4. Check network connectivity
5. Review PLC documentation for MQTT publish settings

---

**Ready to connect?** Update `backend/.env`, restart services, and monitor the logs!
