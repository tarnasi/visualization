const WebSocket = require('ws');

let wss = null;
let mqttUnsubscribe = null;
const clients = new Set();

/**
 * Initialize WebSocket server
 * @param {object} server - HTTP server instance
 * @param {object} mqttService - MQTT service instance
 * @returns {object} WebSocket server
 */
const initialize = (server, mqttService) => {
  wss = new WebSocket.Server({ 
    server,
    path: '/',
    perMessageDeflate: false
  });

  console.log('WebSocket server initialized');

  wss.on('connection', (ws, request) => {
    const clientIp = request.socket.remoteAddress;
    console.log(`✓ WebSocket client connected from ${clientIp}`);
    
    clients.add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Drilling ROP WebSocket Server',
      timestamp: new Date().toISOString(),
      clients: clients.size
    }));

    // Handle incoming messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);

        // Echo back or handle specific commands
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`WebSocket client disconnected from ${clientIp}`);
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      clients.delete(ws);
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Subscribe to MQTT service to receive PLC data
  if (mqttService) {
    mqttUnsubscribe = mqttService.subscribe((data) => {
      // Broadcast MQTT data to all WebSocket clients
      broadcast(data);
    });
    console.log('✓ WebSocket service subscribed to MQTT updates');
  }

  return wss;
};

/**
 * Broadcast message to all connected WebSocket clients
 * @param {object} message - Message to broadcast
 */
const broadcast = (message) => {
  if (clients.size === 0) {
    return;
  }

  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  let successCount = 0;
  let failCount = 0;

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        successCount++;
      } catch (error) {
        console.error('Error sending to WebSocket client:', error);
        failCount++;
        clients.delete(client);
      }
    } else {
      // Clean up closed connections
      clients.delete(client);
    }
  });

  if (successCount > 0) {
    console.log(`Broadcasted to ${successCount} WebSocket client(s)`);
  }
  if (failCount > 0) {
    console.log(`Failed to send to ${failCount} client(s)`);
  }
};

/**
 * Send message to specific client
 * @param {object} ws - WebSocket client
 * @param {object} message - Message to send
 */
const sendToClient = (ws, message) => {
  if (ws.readyState === WebSocket.OPEN) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    ws.send(payload);
  }
};

/**
 * Get WebSocket service statistics
 * @returns {object} Statistics
 */
const getStats = () => {
  return {
    connectedClients: clients.size,
    serverActive: wss !== null,
    clients: Array.from(clients).map(client => ({
      readyState: client.readyState,
      readyStateText: getReadyStateText(client.readyState)
    }))
  };
};

/**
 * Get readable ready state text
 * @param {number} readyState - WebSocket ready state
 * @returns {string} Ready state text
 */
const getReadyStateText = (readyState) => {
  const states = {
    [WebSocket.CONNECTING]: 'CONNECTING',
    [WebSocket.OPEN]: 'OPEN',
    [WebSocket.CLOSING]: 'CLOSING',
    [WebSocket.CLOSED]: 'CLOSED'
  };
  return states[readyState] || 'UNKNOWN';
};

/**
 * Close WebSocket server and all connections
 * @returns {Promise<void>}
 */
const close = () => {
  return new Promise((resolve) => {
    // Unsubscribe from MQTT
    if (mqttUnsubscribe) {
      mqttUnsubscribe();
      mqttUnsubscribe = null;
    }

    // Close all client connections
    clients.forEach((client) => {
      try {
        client.close();
      } catch (error) {
        console.error('Error closing WebSocket client:', error);
      }
    });
    clients.clear();

    // Close server
    if (wss) {
      wss.close(() => {
        console.log('WebSocket server closed');
        wss = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initialize,
  broadcast,
  sendToClient,
  getStats,
  close
};
