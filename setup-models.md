# Model Purchase System Setup

## Database Migrations

To set up the model purchase system, you need to run the following database migrations:

### 1. Create Models Table
Run the migration: `supabase/migrations/20250115_create_models_table.sql`

### 2. Seed Models Data
Run the migration: `supabase/migrations/20250115_seed_models.sql`

## How to Run Migrations

### Option 1: Using Supabase CLI (Recommended)
```bash
# Start Supabase locally (requires Docker Desktop)
npx supabase start

# Apply migrations
npx supabase db reset
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Run the SQL commands

## Features Implemented

### 1. Model Database Structure
- `models` table: Stores available AI models with pricing and features
- `user_models` table: Tracks which models each user has purchased
- Row Level Security (RLS) policies for data protection

### 2. API Endpoints
- `GET /api/models`: Fetch available models and user's purchased models
- `POST /api/purchase-model`: Purchase a model with tokens

### 3. Premium Page Updates
- Added "Available Models" section
- Model cards showing features, pricing, and purchase status
- Token-based purchasing with real-time updates
- Visual indicators for owned models

### 4. Available Models
The system includes these premium models:
- Anime Style v2 (50 tokens)
- Realistic Portrait Pro (75 tokens)
- Fantasy Art Master (60 tokens)
- Cyberpunk Style (55 tokens)
- Oil Painting Classic (45 tokens)
- Manga Style Pro (40 tokens)
- Character Creator Pro (100 tokens)
- Environment Master (80 tokens)

## Usage

1. Users can view available models on the premium page
2. Click "Purchase" to buy a model with tokens
3. Owned models show "Owned" status and are disabled for repurchase
4. Token balance is automatically deducted upon purchase
5. Purchase history is tracked in the database

## Security Features

- Authentication required for all model operations
- Row Level Security prevents unauthorized access
- Token balance validation before purchase
- Duplicate purchase prevention
- Server-side validation for all transactions
