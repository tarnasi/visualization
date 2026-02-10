const { Pool } = require('pg');

// PostgreSQL connection pool
let pool = null;

const createPool = () => {
  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'drilling_data',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: 20, // Maximum number of clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(config);

  pool.on('connect', () => {
    console.log('✓ PostgreSQL client connected to pool');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
    process.exit(-1);
  });

  return pool;
};

const getPool = () => {
  if (!pool) {
    return createPool();
  }
  return pool;
};

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<object>} PostgreSQL client
 */
const getClient = async () => {
  try {
    const client = await getPool().connect();
    return client;
  } catch (error) {
    console.error('Error getting client from pool:', error);
    throw error;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('✓ PostgreSQL connection successful');
    console.log(`  Server time: ${result.rows[0].current_time}`);
    console.log(`  Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    return true;
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:', error.message);
    return false;
  }
};

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
const close = async () => {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL pool closed');
    pool = null;
  }
};

module.exports = {
  query,
  getClient,
  testConnection,
  close,
  getPool
};
