-- Make email optional in users table
-- Remove NOT NULL constraint and update UNIQUE constraint to allow NULL
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Drop the existing unique constraint on email if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_key' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
END $$;

-- Create a unique constraint that allows NULL (multiple NULLs are allowed)
-- This ensures emails are unique when provided, but NULL is allowed
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique 
ON users (email) 
WHERE email IS NOT NULL;

