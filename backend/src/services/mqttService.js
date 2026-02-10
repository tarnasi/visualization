const mqtt = require('mqtt');
const { query } = require('../db/postgres');

// MQTT client instance
let client = null;
let isConnected = false;
let subscribers = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Configuration
const config = {
  broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  topic: process.env.MQTT_TOPIC || 'plc/drilling/rop',
  clientId: `drilling_backend_${Math.random().toString(16).slice(2, 8)}`,
  options: {
    clean: true,
    connectTimeout: 4000,
    keepalive: 60,
    reconnectPeriod: 3000,
  }
};

/**
 * Connect to MQTT broker and subscribe to topic
 * @returns {Promise<object>} MQTT client
 */
const connect = () => {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to MQTT broker: ${config.broker}`);
    console.log(`  Client ID: ${config.clientId}`);
    console.log(`  Topic: ${config.topic}`);

    client = mqtt.connect(config.broker, {
      ...config.options,
      clientId: config.clientId,
    });

    client.on('connect', () => {
      isConnected = true;
      reconnectAttempts = 0;
      console.log('✓ MQTT broker connected');
      
      // Subscribe to the topic
      client.subscribe(config.topic, { qos: 1 }, (err) => {
        if (err) {
          console.error('✗ MQTT subscription failed:', err);
          reject(err);
        } else {
          console.log(`✓ Subscribed to topic: ${config.topic}`);
          resolve(client);
        }
      });
    });

    client.on('message', async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`MQTT message received on ${topic}:`, data);

        // Validate message structure
        if (!data.depth || !data.time || data.rop === undefined) {
          console.warn('Invalid MQTT message format:', data);
          return;
        }

        // Optionally store to PostgreSQL (for historical data)
        if (process.env.STORE_MQTT_DATA === 'true') {
          try {
            await storeToPostgres(data);
          } catch (error) {
            console.error('Error storing MQTT data to PostgreSQL:', error);
          }
        }

        // Broadcast to all subscribers
        broadcastToSubscribers({
          type: 'rop_data',
          data: {
            depth: parseFloat(data.depth),
            time: data.time,
            rop: parseFloat(data.rop)
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    });

    client.on('error', (error) => {
      console.error('MQTT client error:', error);
      isConnected = false;
    });

    client.on('disconnect', () => {
      console.log('MQTT client disconnected');
      isConnected = false;
    });

    client.on('reconnect', () => {
      reconnectAttempts++;
      console.log(`MQTT reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max MQTT reconnect attempts reached');
        client.end();
      }
    });

    client.on('offline', () => {
      console.log('MQTT client offline');
      isConnected = false;
    });

    // Timeout if connection takes too long
    setTimeout(() => {
      if (!isConnected) {
        reject(new Error('MQTT connection timeout'));
      }
    }, 10000);
  });
};

/**
 * Store MQTT data to PostgreSQL
 * @param {object} data - ROP data
 */
const storeToPostgres = async (data) => {
  try {
    await query(
      `INSERT INTO drilling_rop_data (depth, timestamp, rop)
       VALUES ($1, $2, $3)
       ON CONFLICT (depth, timestamp) DO NOTHING`,
      [data.depth, data.time, data.rop]
    );
  } catch (error) {
    // Don't throw, just log to avoid disrupting message flow
    console.error('PostgreSQL insert error:', error.message);
  }
};

/**
 * Subscribe to MQTT data updates
 * @param {Function} callback - Callback function to receive data
 * @returns {Function} Unsubscribe function
 */
const subscribe = (callback) => {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  subscribers.add(callback);
  console.log(`Subscriber added. Total subscribers: ${subscribers.size}`);

  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
    console.log(`Subscriber removed. Total subscribers: ${subscribers.size}`);
  };
};

/**
 * Broadcast data to all subscribers
 * @param {object} data - Data to broadcast
 */
const broadcastToSubscribers = (data) => {
  if (subscribers.size === 0) {
    return;
  }

  subscribers.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error('Error in subscriber callback:', error);
    }
  });
};

/**
 * Publish message to MQTT topic (for testing)
 * @param {string} topic - Topic to publish to
 * @param {object} message - Message object
 * @returns {Promise<void>}
 */
const publish = (topic, message) => {
  return new Promise((resolve, reject) => {
    if (!client || !isConnected) {
      reject(new Error('MQTT client not connected'));
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('MQTT publish error:', err);
        reject(err);
      } else {
        console.log(`MQTT message published to ${topic}`);
        resolve();
      }
    });
  });
};

/**
 * Get MQTT service status
 * @returns {object} Status information
 */
const getStatus = () => {
  return {
    connected: isConnected,
    broker: config.broker,
    topic: config.topic,
    clientId: config.clientId,
    subscribers: subscribers.size,
    reconnectAttempts
  };
};

/**
 * Disconnect from MQTT broker
 * @returns {Promise<void>}
 */
const disconnect = () => {
  return new Promise((resolve) => {
    if (client) {
      client.end(false, () => {
        console.log('MQTT client disconnected gracefully');
        isConnected = false;
        subscribers.clear();
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  connect,
  subscribe,
  publish,
  getStatus,
  disconnect
};
