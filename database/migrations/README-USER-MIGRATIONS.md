# User-Related Migrations

This directory contains migrations to make `last_name` and `email` optional in the users table.

## Migrations

1. **make-last-name-nullable.sql** - Makes `last_name` column nullable
2. **make-email-optional.sql** - Makes `email` column optional and updates unique constraint

## How to Apply

### Option 1: Using psql (Recommended for Production)

```bash
# If you have DATABASE_URL set
psql "$DATABASE_URL" -f database/migrations/make-last-name-nullable.sql
psql "$DATABASE_URL" -f database/migrations/make-email-optional.sql

# Or with individual connection parameters
psql -h your_host -U your_user -d your_database -f database/migrations/make-last-name-nullable.sql
psql -h your_host -U your_user -d your_database -f database/migrations/make-email-optional.sql
```

### Option 2: Using the Python Script

```bash
# Set your database connection
export DATABASE_URL="postgresql://user:password@host:port/database"
# OR
export DB_HOST=your_host
export DB_USER=your_user
export DB_NAME=your_database
export DB_PASSWORD=your_password

# Run the script
python3 scripts/apply-user-migrations.py
```

### Option 3: Using the Shell Script (via Backend API)

```bash
# Make sure your backend is running
export BACKEND_URL="http://localhost:8000"  # or your backend URL

# Run the script
./scripts/apply-user-migrations.sh
```

### Option 4: Via Backend API Endpoint

If your backend is running, you can use the `/api/v1/execute-sql` endpoint:

```bash
# For make-last-name-nullable.sql
curl -X POST http://localhost:8000/api/v1/execute-sql \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "sql": "$(cat database/migrations/make-last-name-nullable.sql | python3 -c 'import sys, json; print(json.dumps(sys.stdin.read()))')"
}
EOF

# For make-email-optional.sql
curl -X POST http://localhost:8000/api/v1/execute-sql \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "sql": "$(cat database/migrations/make-email-optional.sql | python3 -c 'import sys, json; print(json.dumps(sys.stdin.read()))')"
}
EOF
```

## What These Migrations Do

### make-last-name-nullable.sql
- Removes the `NOT NULL` constraint from the `last_name` column
- Allows users to be created without a last name

### make-email-optional.sql
- Removes the `NOT NULL` constraint from the `email` column
- Drops the existing unique constraint on email
- Creates a new unique index that allows NULL values (multiple NULLs allowed, but emails must be unique when provided)
- Allows users to be created without an email address

## Verification

After applying migrations, verify with:

```sql
-- Check column nullability
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('last_name', 'email');

-- Check email unique index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%email%';
```

## Notes

- These migrations are safe to run multiple times (idempotent)
- The email migration uses `IF EXISTS` checks to avoid errors if already applied
- Make sure to backup your database before applying migrations in production

