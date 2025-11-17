-- Setup script for test database
-- Run this script to create the test database

CREATE DATABASE IF NOT EXISTS wallet_service_test;

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON wallet_service_test.* TO 'root'@'localhost';
-- FLUSH PRIVILEGES;

USE wallet_service_test;

-- Database is ready for migrations
SELECT 'Test database created successfully!' AS message;
