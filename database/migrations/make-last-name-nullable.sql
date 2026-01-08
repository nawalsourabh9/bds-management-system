-- Make last_name nullable in users table
ALTER TABLE users ALTER COLUMN last_name DROP NOT NULL;

