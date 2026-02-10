const express = require('express');
const router = express.Router();
const { query } = require('../db/postgres');

/**
 * GET /api/data/historical
 * Query historical drilling ROP data from PostgreSQL
 */
router.get('/historical', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      minDepth,
      maxDepth,
      limit = 10000,
      offset = 0
    } = req.query;

    // Build dynamic query
    let queryText = 'SELECT id, depth, timestamp as time, rop, created_at FROM drilling_rop_data WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Add filters
    if (startDate) {
      queryText += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (minDepth !== undefined) {
      queryText += ` AND depth >= $${paramIndex}`;
      params.push(parseFloat(minDepth));
      paramIndex++;
    }

    if (maxDepth !== undefined) {
      queryText += ` AND depth <= $${paramIndex}`;
      params.push(parseFloat(maxDepth));
      paramIndex++;
    }

    // Order and pagination
    queryText += ' ORDER BY timestamp DESC';
    queryText += ` LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));
    paramIndex++;

    queryText += ` OFFSET $${paramIndex}`;
    params.push(parseInt(offset, 10));

    // Execute query
    const result = await query(queryText, params);

    // Get total count for pagination
    let countQueryText = 'SELECT COUNT(*) as total FROM drilling_rop_data WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (startDate) {
      countQueryText += ` AND timestamp >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQueryText += ` AND timestamp <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }

    if (minDepth !== undefined) {
      countQueryText += ` AND depth >= $${countParamIndex}`;
      countParams.push(parseFloat(minDepth));
      countParamIndex++;
    }

    if (maxDepth !== undefined) {
      countQueryText += ` AND depth <= $${countParamIndex}`;
      countParams.push(parseFloat(maxDepth));
    }

    const countResult = await query(countQueryText, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      total,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + result.rows.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      message: error.message
    });
  }
});

/**
 * GET /api/data/statistics
 * Get summary statistics about drilling data
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let queryText = `
      SELECT 
        COUNT(*) as total_records,
        MIN(depth) as min_depth,
        MAX(depth) as max_depth,
        AVG(rop)::NUMERIC(10,4) as avg_rop,
        MIN(rop) as min_rop,
        MAX(rop) as max_rop,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time
      FROM drilling_rop_data
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (startDate) {
      queryText += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
    }

    const result = await query(queryText, params);
    const stats = result.rows[0];

    res.json({
      success: true,
      statistics: {
        total_records: parseInt(stats.total_records, 10),
        min_depth: parseFloat(stats.min_depth) || 0,
        max_depth: parseFloat(stats.max_depth) || 0,
        avg_rop: parseFloat(stats.avg_rop) || 0,
        min_rop: parseFloat(stats.min_rop) || 0,
        max_rop: parseFloat(stats.max_rop) || 0,
        start_time: stats.start_time,
        end_time: stats.end_time
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/data/depth-intervals
 * Get aggregated ROP data by depth intervals
 */
router.get('/depth-intervals', async (req, res) => {
  try {
    const {
      intervalSize = 10,
      startDate,
      endDate
    } = req.query;

    const interval = parseFloat(intervalSize);

    let queryText = `
      SELECT 
        FLOOR(depth / $1) * $1 as interval_start,
        FLOOR(depth / $1) * $1 + $1 as interval_end,
        COUNT(*) as sample_count,
        AVG(rop)::NUMERIC(10,4) as avg_rop,
        MIN(rop) as min_rop,
        MAX(rop) as max_rop,
        STDDEV(rop)::NUMERIC(10,4) as stddev_rop
      FROM drilling_rop_data
      WHERE 1=1
    `;

    const params = [interval];
    let paramIndex = 2;

    if (startDate) {
      queryText += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
    }

    queryText += ' GROUP BY interval_start, interval_end';
    queryText += ' ORDER BY interval_start ASC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        interval_start: parseFloat(row.interval_start),
        interval_end: parseFloat(row.interval_end),
        sample_count: parseInt(row.sample_count, 10),
        avg_rop: parseFloat(row.avg_rop) || 0,
        min_rop: parseFloat(row.min_rop) || 0,
        max_rop: parseFloat(row.max_rop) || 0,
        stddev_rop: parseFloat(row.stddev_rop) || 0
      })),
      count: result.rows.length,
      intervalSize: interval
    });

  } catch (error) {
    console.error('Error fetching depth intervals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch depth intervals',
      message: error.message
    });
  }
});

/**
 * POST /api/data/insert
 * Insert new drilling data (for testing)
 */
router.post('/insert', async (req, res) => {
  try {
    const { depth, time, rop } = req.body;

    if (!depth || !time || rop === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: depth, time, rop'
      });
    }

    const result = await query(
      `INSERT INTO drilling_rop_data (depth, timestamp, rop)
       VALUES ($1, $2, $3)
       ON CONFLICT (depth, timestamp) DO NOTHING
       RETURNING *`,
      [depth, time, rop]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        error: 'Data already exists for this depth and timestamp'
      });
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Data inserted successfully'
    });

  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to insert data',
      message: error.message
    });
  }
});

module.exports = router;
