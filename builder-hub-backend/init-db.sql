-- AWS Builder Hub Database Initialization Script

-- Create database if not exists (PostgreSQL doesn't support IF NOT EXISTS for databases)
-- This will be handled by POSTGRES_DB environment variable

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE awsbuilderdb TO awsbuilder;

-- Create schema if needed
-- CREATE SCHEMA IF NOT EXISTS aws_builder_hub;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO awsbuilder;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO awsbuilder;

-- Log initialization
SELECT 'AWS Builder Hub database initialized successfully' AS status;