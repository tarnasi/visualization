-- Drilling ROP Data Visualization Database Schema
-- PostgreSQL Database Schema for Oil & Gas Drilling Data

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS drilling_rop_data CASCADE;
DROP TABLE IF EXISTS wells CASCADE;
DROP FUNCTION IF EXISTS insert_sample_data(NUMERIC, NUMERIC, TIMESTAMP);

-- Main drilling ROP data table
CREATE TABLE drilling_rop_data (
    id BIGSERIAL PRIMARY KEY,
    depth NUMERIC(10, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    rop NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_depth_timestamp UNIQUE (depth, timestamp),
    CONSTRAINT positive_depth CHECK (depth >= 0),
    CONSTRAINT positive_rop CHECK (rop >= 0)
);

-- Create indexes for optimized queries
CREATE INDEX idx_drilling_timestamp ON drilling_rop_data(timestamp DESC);
CREATE INDEX idx_drilling_depth ON drilling_rop_data(depth);
CREATE INDEX idx_drilling_rop ON drilling_rop_data(rop);
CREATE INDEX idx_drilling_depth_timestamp ON drilling_rop_data(depth, timestamp DESC);

-- Wells metadata table
CREATE TABLE wells (
    id SERIAL PRIMARY KEY,
    well_name VARCHAR(255) NOT NULL UNIQUE,
    planned_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    target_depth NUMERIC(10, 2),
    current_depth NUMERIC(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('planning', 'active', 'completed', 'suspended', 'abandoned'))
);

CREATE INDEX idx_wells_status ON wells(status);
CREATE INDEX idx_wells_name ON wells(well_name);

-- Function to insert sample test data
CREATE OR REPLACE FUNCTION insert_sample_data(
    p_start_depth NUMERIC,
    p_end_depth NUMERIC,
    p_start_time TIMESTAMP
) RETURNS void AS $$
DECLARE
    current_depth NUMERIC;
    current_time TIMESTAMP;
    random_rop NUMERIC;
    depth_increment NUMERIC := 0.1;
    time_increment INTERVAL := INTERVAL '1 second';
BEGIN
    current_depth := p_start_depth;
    current_time := p_start_time;
    
    RAISE NOTICE 'Inserting sample data from depth % to % starting at %', 
                 p_start_depth, p_end_depth, p_start_time;
    
    WHILE current_depth <= p_end_depth LOOP
        -- Generate realistic ROP values (5-25 m/hr with some variation)
        random_rop := 5 + (RANDOM() * 20);
        
        -- Add some depth-based variation (slower at deeper depths)
        IF current_depth > 1000 THEN
            random_rop := random_rop * 0.8;
        END IF;
        IF current_depth > 2000 THEN
            random_rop := random_rop * 0.7;
        END IF;
        
        INSERT INTO drilling_rop_data (depth, timestamp, rop)
        VALUES (current_depth, current_time, random_rop)
        ON CONFLICT (depth, timestamp) DO NOTHING;
        
        current_depth := current_depth + depth_increment;
        current_time := current_time + time_increment;
    END LOOP;
    
    RAISE NOTICE 'Sample data insertion complete';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM drilling_rop_data
    WHERE created_at < (CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL);
    
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % rows older than % days', rows_deleted, p_days_to_keep;
    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Insert a demo well
INSERT INTO wells (well_name, planned_start_date, planned_end_date, target_depth, status)
VALUES (
    'WELL-001',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP + INTERVAL '60 days',
    3000.00,
    'active'
) ON CONFLICT (well_name) DO NOTHING;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON drilling_rop_data TO your_app_user;
-- GRANT SELECT ON wells TO your_app_user;

-- Display table info
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - drilling_rop_data';
    RAISE NOTICE '  - wells';
    RAISE NOTICE '';
    RAISE NOTICE 'To insert sample data, run:';
    RAISE NOTICE '  SELECT insert_sample_data(0, 1000, NOW() - INTERVAL ''7 days'');';
    RAISE NOTICE '';
    RAISE NOTICE 'To check data:';
    RAISE NOTICE '  SELECT COUNT(*) FROM drilling_rop_data;';
    RAISE NOTICE '  SELECT * FROM drilling_rop_data ORDER BY timestamp DESC LIMIT 10;';
    RAISE NOTICE '';
END $$;
