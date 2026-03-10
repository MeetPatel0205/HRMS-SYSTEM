-- Initialize HRMS Database
-- This script sets up the initial database structure and seed data

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the user has the correct password
ALTER USER hrms_user WITH PASSWORD 'hrms_password';

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON DATABASE hrms_db TO hrms_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO hrms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hrms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hrms_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO hrms_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO hrms_user;

-- Set timezone
SET timezone = 'UTC';