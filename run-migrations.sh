#!/bin/bash

# Database connection string
DB_URL="postgresql://postgres:aa7zyMpFjwBcFYp7@db.eikdyefqljyydvkgigak.supabase.co:5432/postgres?sslmode=require"

echo "🚀 Starting database migration..."

# Run base schema
echo "📄 Running schema.sql..."
psql "$DB_URL" -f supabase/schema.sql

# Run complete setup
echo "📄 Running complete-setup.sql..."
psql "$DB_URL" -f supabase/complete-setup.sql

# Run all migrations in order
echo "📦 Running migrations..."
for file in supabase/migrations/*.sql; do
  echo "  ✓ Running $(basename $file)..."
  psql "$DB_URL" -f "$file" 2>&1 | grep -v "already exists" | grep -v "duplicate"
done

echo "✅ Migration complete!"