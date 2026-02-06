# Configurable Monthly Bonus Tokens per Subscription Plan

This feature allows administrators to configure the amount of monthly bonus tokens granted to subscribers on a per-plan basis. Previously, this was a fixed amount (100 tokens) for all subscribers.

## Feature Overview

-   **Per-Plan Configuration**: Each subscription plan can have a unique monthly bonus token amount.
-   **Admin Interface**: The value can be edited directly in the Admin Dashboard under Subscription Plans.
-   **Automated Granting**: The monthly cron job automatically respects the configured amount for each user's plan.

## Implementation Details

### Database Changes

A new migration file `supabase/migrations/20251202_per_plan_bonus_tokens.sql` has been created. It performs the following:

1.  **Schema Update**: Adds `monthly_bonus_tokens` column to the `subscription_plans` table (Integer, Default: 100).
2.  **Function Update**: Updates `grant_monthly_tokens_to_subscribers` and `grant_tokens_to_subscriber` PostgreSQL functions to fetch the bonus amount from the `subscription_plans` table instead of using a hardcoded value.

### Backend Updates

-   **Types**: Updated `SubscriptionPlan` interface in `types/subscription.ts`.
-   **Library**: Updated `lib/subscription-plans.ts` to handle the new field in `createSubscriptionPlan` and `updateSubscriptionPlan` functions.
-   **API**: Updated `app/api/cron/grant-subscription-tokens/route.ts` to correctly calculate the total tokens granted in the summary report.

### Frontend Updates

-   **Form**: Updated `components/subscription-plan-form.tsx` to include a numeric input field for "Monthly Bonus Tokens" in the Pricing section.

## How to Use

1.  **Apply Migration**: Ensure the database migration `supabase/migrations/20251202_per_plan_bonus_tokens.sql` is applied to your Supabase instance.
2.  **Configure Plans**:
    *   Navigate to **Admin Dashboard** > **Subscriptions**.
    *   Click **New Plan** or **Edit** an existing plan.
    *   In the **Pricing** section, set the **Monthly Bonus Tokens** amount.
    *   Save the plan.
3.  **Verification**:
    *   The monthly cron job (`/api/cron/grant-subscription-tokens`) will now use these values when granting tokens on the 1st of each month.
    *   Users will receive the specific amount configured for their active subscription plan.

## Cron Job Configuration

The token granting process is triggered by an API endpoint: `/api/cron/grant-subscription-tokens`. This endpoint does not run automatically; it must be triggered by an external scheduler (a "cron job").

### How it works
1.  **Endpoint**: Your server hosts the endpoint at `https://your-domain.com/api/cron/grant-subscription-tokens`.
2.  **Protection**: The endpoint is protected by a secret key to prevent unauthorized access. You must set the `CRON_SECRET` environment variable in your deployment settings (e.g., Vercel, .env).
3.  **Execution**: When the endpoint is called with the correct `Authorization: Bearer <CRON_SECRET>` header, it executes the database function `grant_monthly_tokens_to_subscribers`.

### Setting up the Cron Job

You have several options to set this up:

#### Option 1: Vercel Cron (Recommended if hosting on Vercel)
If your project is hosted on Vercel, you can use Vercel Cron.
1.  Add a `vercel.json` file to your project root (if not already present):
    ```json
    {
      "crons": [
        {
          "path": "/api/cron/grant-subscription-tokens",
          "schedule": "0 0 1 * *"
        }
      ]
    }
    ```
    This schedule `0 0 1 * *` runs at midnight on the 1st day of every month.

#### Option 2: External Cron Service (e.g., EasyCron, cron-job.org)
1.  Create a new job in the external service.
2.  **URL**: `https://your-domain.com/api/cron/grant-subscription-tokens`
3.  **Method**: `POST`
4.  **Headers**: Add `Authorization: Bearer YOUR_CRON_SECRET_VALUE` (replace with your actual secret).
5.  **Schedule**: Set to run monthly (e.g., on the 1st of the month).

#### Option 3: GitHub Actions
You can use a GitHub Action to trigger the endpoint. Create `.github/workflows/monthly-tokens.yml`:
```yaml
name: Grant Monthly Tokens
on:
  schedule:
    - cron: '0 0 1 * *' # Runs at 00:00 on the 1st of every month
jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Call API Endpoint
        run: |
          curl -X POST https://your-domain.com/api/cron/grant-subscription-tokens \
          -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Troubleshooting

-   **Tokens not granting?** Check the cron job logs or call the endpoint manually to verify the response summary.
-   **Wrong amount?** Verify the `monthly_bonus_tokens` value for the plan in the database or admin dashboard.
-   **401 Unauthorized?** Ensure the `CRON_SECRET` environment variable matches the token provided in the Authorization header.
