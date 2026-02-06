# Affiliate System Documentation

## Overview

The affiliate system allows users to earn commissions by promoting the fantasy character platform. It includes comprehensive tracking, management, and payout functionality.

## Features

### For Affiliates
- **Application System**: Users can apply to become affiliates
- **Dashboard**: Comprehensive dashboard with stats, links, and earnings
- **Link Generation**: Create different types of affiliate links
- **Real-time Tracking**: Track clicks, conversions, and earnings
- **Commission Management**: View commission history and payout status

### For Administrators
- **Application Review**: Approve or reject affiliate applications
- **Performance Monitoring**: Track affiliate performance and statistics
- **Commission Management**: Manage commission rates and payouts
- **Analytics**: Detailed analytics and reporting

## Database Schema

### Core Tables

#### `affiliates`
- Stores affiliate account information
- Tracks commission rates, earnings, and performance metrics
- Links to user accounts

#### `affiliate_links`
- Stores generated affiliate links
- Tracks click and conversion counts per link
- Supports different link types (general, character, premium, custom)

#### `affiliate_clicks`
- Records every click on affiliate links
- Tracks visitor information and conversion status
- Links clicks to conversions

#### `affiliate_commissions`
- Records commission payments
- Links to transactions and affiliate accounts
- Tracks commission status and amounts

#### `affiliate_payouts`
- Manages payout requests and payments
- Groups commissions for payout processing
- Tracks payout status and methods

#### `affiliate_settings`
- Stores global affiliate program settings
- Configurable commission rates, payout thresholds, etc.

## API Endpoints

### Public Endpoints

#### `POST /api/affiliate/apply`
- Apply for affiliate program
- Creates new affiliate account with pending status

#### `GET /api/affiliate/dashboard`
- Get affiliate dashboard data
- Returns stats, links, commissions, and clicks

#### `POST /api/affiliate/links`
- Create new affiliate link
- Supports different link types and custom codes

#### `GET /api/affiliate/track?ref={code}`
- Track affiliate click
- Sets affiliate cookie and records click

### Admin Endpoints

#### `GET /api/affiliate/admin`
- Get all affiliates and settings
- Admin-only access

#### `PUT /api/affiliate/admin`
- Update affiliate status or commission rate
- Admin-only access

## Tracking System

### Click Tracking
- Automatic tracking via middleware
- Cookie-based attribution (30-day duration)
- IP, user agent, and referrer tracking

### Conversion Tracking
- Links clicks to successful payments
- Automatic commission calculation
- Real-time earnings updates

### Attribution Model
- Last-click attribution
- 30-day cookie duration
- Supports multiple link types

## Usage Examples

### Creating an Affiliate Link

```typescript
import { generateAffiliateUrl } from '@/lib/affiliate-tracking'

const affiliateUrl = generateAffiliateUrl(
  'https://example.com',
  'AFFILIATE123',
  'character'
)
// Result: https://example.com?ref=AFFILIATE123&type=character
```

### Tracking Conversions

```typescript
import { recordAffiliateConversion } from '@/lib/affiliate-tracking'

await recordAffiliateConversion({
  click_id: 'click-uuid',
  transaction_id: 'transaction-uuid',
  conversion_value: 29.99
})
```

### Admin Management

```typescript
// Approve affiliate
await updateAffiliateStatus('affiliate-id', 'approved', 15.0)

// Suspend affiliate
await updateAffiliateStatus('affiliate-id', 'suspended')
```

## Components

### User-Facing Components

#### `AffiliateDashboard`
- Main dashboard for affiliates
- Shows stats, links, commissions, and clicks
- Tabbed interface for different data views

#### `AffiliateLink`
- Reusable component for displaying affiliate links
- Includes copy, share, and tracking functionality
- Supports different link types

### Admin Components

#### `AdminAffiliateManagement`
- Complete admin interface for affiliate management
- Application review, performance monitoring
- Commission and payout management

## Configuration

### Environment Variables
- No additional environment variables required
- Uses existing Supabase configuration

### Settings
- Default commission rate: 10%
- Minimum payout: $50
- Cookie duration: 30 days
- Payout frequency: Monthly

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admins have full access to all data

### Data Protection
- IP addresses are stored for tracking
- User agents stored for analytics
- Referrer information for attribution

## Performance

### Database Indexes
- Optimized indexes on frequently queried columns
- Composite indexes for complex queries
- Foreign key indexes for joins

### Caching
- No additional caching implemented
- Relies on Supabase's built-in caching

## Monitoring

### Analytics
- Click tracking and conversion rates
- Revenue attribution
- Performance metrics per affiliate

### Error Handling
- Graceful degradation if tracking fails
- Comprehensive error logging
- Non-blocking error handling

## Future Enhancements

### Planned Features
- Advanced attribution models
- A/B testing for affiliate links
- Automated payout processing
- Enhanced analytics dashboard
- Multi-tier affiliate programs
- Custom commission structures

### Integration Opportunities
- Email marketing platforms
- Social media tracking
- Advanced analytics tools
- Payment processors
- CRM systems

## Troubleshooting

### Common Issues

#### Tracking Not Working
- Check middleware configuration
- Verify Supabase RLS policies
- Check browser console for errors

#### Commissions Not Calculating
- Verify transaction integration
- Check affiliate approval status
- Review commission rate settings

#### Admin Access Issues
- Verify admin user permissions
- Check RLS policies for admin_users table
- Ensure proper authentication

### Debug Mode
- Enable detailed logging in development
- Check Supabase logs for RPC function errors
- Monitor network requests in browser dev tools
