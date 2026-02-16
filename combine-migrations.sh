#!/bin/bash

echo "📦 Combining all migrations into one file..."

# Start with base schemas
cat supabase/schema.sql > all_migrations.sql
echo "" >> all_migrations.sql
cat supabase/complete-setup.sql >> all_migrations.sql
echo "" >> all_migrations.sql

# Add all migrations
for file in supabase/migrations/*.sql; do
  echo "-- ========================================" >> all_migrations.sql
  echo "-- Migration: $(basename $file)" >> all_migrations.sql
  echo "-- ========================================" >> all_migrations.sql
  cat "$file" >> all_migrations.sql
  echo "" >> all_migrations.sql
done

echo "✅ Created all_migrations.sql"
echo "📋 Now copy the contents and paste into Supabase SQL Editor!"