require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

// Database connections
const postgres = require('./db/postgres');
const mongodb = require('./db/mongodb');

// Services
const mqttService = require('./services/mqttService');
const websocketService = require('./services/websocketService');
const pdfService = require('./services/pdfService');

// Routes
const dataRoutes = require('./routes/dataRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost').split(',');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      services: {
        postgres: false,
        mongodb: false,
        mqtt: false,
        websocket: false,
        pdf: false
      }
    };

    // Check PostgreSQL
    try {
      await postgres.query('SELECT 1');
      health.services.postgres = true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error.message);
    }

    // Check MongoDB
    try {
      const db = mongodb.getDb();
      await db.admin().ping();
      health.services.mongodb = true;
    } catch (error) {
      console.error('MongoDB health check failed:', error.message);
    }

    // Check MQTT
    const mqttStatus = mqttService.getStatus();
    health.services.mqtt = mqttStatus.connected;
    health.mqttInfo = mqttStatus;

    // Check WebSocket
    const wsStats = websocketService.getStats();
    health.services.websocket = wsStats.serverActive;
    health.websocketInfo = wsStats;

    // Check PDF service
    const pdfStatus = pdfService.getStatus();
    health.services.pdf = pdfStatus.initialized;

    // Determine overall status
    const allServicesHealthy = Object.values(health.services).every(status => status === true);
    health.status = allServicesHealthy ? 'healthy' : 'degraded';

    const statusCode = allServicesHealthy ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes
app.use('/api/data', dataRoutes);
app.use('/api/pdf', pdfRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize services and start server
const startServer = async () => {
  try {
    console.log('='.repeat(60));
    console.log('🚀 Starting Drilling ROP Visualization Backend Server');
    console.log('='.repeat(60));
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log('');

    // 1. Test PostgreSQL connection
    console.log('📊 Connecting to PostgreSQL...');
    const pgConnected = await postgres.testConnection();
    if (!pgConnected) {
      console.warn('⚠️  PostgreSQL connection failed - continuing anyway');
    }
    console.log('');

    // 2. Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    try {
      await mongodb.connectMongo();
      await mongodb.initializeCollections();
    } catch (error) {
      console.warn('⚠️  MongoDB connection failed:', error.message);
      console.warn('⚠️  Continuing without MongoDB');
    }
    console.log('');

    // 3. Initialize Puppeteer browser for PDF service
    console.log('🖨️  Initializing PDF service (Puppeteer)...');
    try {
      await pdfService.initializeBrowser();
    } catch (error) {
      console.warn('⚠️  PDF service initialization failed:', error.message);
      console.warn('⚠️  PDF generation will not be available');
    }
    console.log('');

    // 4. Connect to MQTT broker
    console.log('📡 Connecting to MQTT broker...');
    try {
      await mqttService.connect();
    } catch (error) {
      console.warn('⚠️  MQTT connection failed:', error.message);
      console.warn('⚠️  Real-time data streaming will not be available');
    }
    console.log('');

    // 5. Initialize WebSocket server
    console.log('🔌 Initializing WebSocket server...');
    websocketService.initialize(server, mqttService);
    console.log('');

    // 6. Start HTTP server
    server.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ API endpoint: http://localhost:${PORT}/api`);
      console.log(`✓ WebSocket: ws://localhost:${PORT}`);
      console.log('='.repeat(60));
      console.log('');
      console.log('📝 Logs:');
    });

  } catch (error) {
    console.error('❌ Fatal error starting server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log('');
  console.log('='.repeat(60));
  console.log(`🛑 ${signal} received. Starting graceful shutdown...`);
  console.log('='.repeat(60));

  // Close HTTP server (stop accepting new connections)
  server.close(async () => {
    console.log('✓ HTTP server closed');

    try {
      // Close WebSocket connections
      console.log('Closing WebSocket connections...');
      await websocketService.close();

      // Disconnect MQTT
      console.log('Disconnecting MQTT...');
      await mqttService.disconnect();

      // Close databases
      console.log('Closing database connections...');
      await postgres.close();
      await mongodb.closeMongo();

      // Close Puppeteer browser
      console.log('Closing Puppeteer browser...');
      await pdfService.closeBrowser();

      console.log('='.repeat(60));
      console.log('✓ Graceful shutdown complete');
      console.log('='.repeat(60));
      process.exit(0);

    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

module.exports = { app, server };
