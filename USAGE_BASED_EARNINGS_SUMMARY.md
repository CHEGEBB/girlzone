# Usage-Based Model Earnings System

## 🎯 Overview

I have implemented a comprehensive usage-based earnings system where model creators earn more money based on how much their models are used. The system includes real-time analytics, dynamic earnings calculation, and complete admin management tools.

## 🏗️ System Architecture

### Database Structure
- **`model_usage_logs`**: Tracks every model usage with tokens consumed and earnings generated
- **`model_creator_earnings`**: Aggregates total earnings per model for creators
- **`earnings_transactions`**: Manages payouts and financial transactions
- **`model_analytics`**: Daily analytics for detailed performance tracking

### Key Features
- **Dynamic Earnings**: More usage = higher earnings multiplier
- **Real-time Tracking**: Every model use is logged and calculated
- **Tiered Multipliers**: Popular models earn up to 250% more
- **Usage Type Bonuses**: Different rates for image generation, chat, etc.
- **Creator Analytics**: Comprehensive dashboard for model creators
- **Admin Management**: Complete earnings and payout management

## 💰 Earnings Calculation System

### Base Earnings Formula
```typescript
baseEarnings = earningsPerUse + (tokensConsumed × earningsPerToken)
totalEarnings = baseEarnings × usageMultiplier × typeMultiplier
```

### Usage Multipliers (Based on Total Usage)
- **10,000+ uses**: 2.5x multiplier (250% earnings)
- **5,000+ uses**: 2.0x multiplier (200% earnings)
- **1,000+ uses**: 1.5x multiplier (150% earnings)
- **100+ uses**: 1.2x multiplier (120% earnings)
- **<100 uses**: 1.0x multiplier (100% earnings)

### Usage Type Multipliers
- **Image Generation**: 1.0x (base rate)
- **Chat**: 0.8x (slightly lower)
- **Other**: 0.6x (lower rate)

## 📊 Analytics & Tracking

### Real-time Usage Tracking
- **Every Model Use**: Automatically logged with metadata
- **Token Consumption**: Tracks exact tokens used per generation
- **Earnings Calculation**: Real-time earnings calculation and storage
- **User Attribution**: Links usage to specific users and creators

### Creator Analytics Dashboard
- **Total Earnings**: Lifetime earnings across all models
- **Model Performance**: Individual model earnings and usage stats
- **Usage Trends**: Daily, weekly, monthly analytics
- **Top Models**: Best performing models by earnings
- **Recent Activity**: Latest usage and earnings

### Admin Management
- **Creator Earnings**: View all creator earnings and performance
- **Transaction Management**: Create and manage payouts
- **Status Tracking**: Pending, completed, failed transactions
- **Bulk Operations**: Manage multiple creators and models

## 🔧 Technical Implementation

### Core Components

#### 1. Earnings Calculator (`lib/earnings-calculator.ts`)
```typescript
// Calculate dynamic earnings based on usage
export async function calculateModelEarnings(
  modelId: string,
  tokensConsumed: number,
  usageType: 'image_generation' | 'chat' | 'other'
): Promise<EarningsCalculation>

// Log usage and update earnings
export async function logModelUsage(
  userId: string,
  modelId: string,
  tokensConsumed: number,
  usageType: string,
  metadata: any
): Promise<boolean>
```

#### 2. Usage Tracking API (`app/api/track-model-usage/route.ts`)
- **POST**: Log model usage and calculate earnings
- **Authentication**: Requires valid user session
- **Monetization Check**: Respects monetization enabled/disabled status
- **Error Handling**: Graceful fallback if tracking fails

#### 3. Creator Analytics API (`app/api/creator-analytics/route.ts`)
- **GET**: Fetch comprehensive creator analytics
- **Period Filtering**: 7, 30, 90, 365 days
- **Model Filtering**: Specific model or all models
- **Real-time Data**: Live earnings and usage statistics

#### 4. Creator Analytics Dashboard (`components/creator-analytics-dashboard.tsx`)
- **Summary Cards**: Total earnings, models, usage, averages
- **Model Performance**: Detailed model-by-model analytics
- **Transaction History**: Recent earnings and payouts
- **Interactive Filters**: Period and model selection

#### 5. Admin Earnings Management (`app/admin/dashboard/creator-earnings/page.tsx`)
- **Creator Overview**: All creators and their earnings
- **Transaction Management**: Create, update, track payouts
- **Status Management**: Pending, completed, failed transactions
- **Bulk Operations**: Manage multiple transactions

### Integration Points

#### Image Generation API Integration
```typescript
// After successful token deduction
const usageResponse = await fetch('/api/track-model-usage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-ID': userId
  },
  body: JSON.stringify({
    modelId: actualModel,
    tokensConsumed: tokenCost,
    usageType: 'image_generation',
    metadata: {
      imageCount: actualImageCount,
      prompt: prompt.substring(0, 100),
      size: size
    }
  })
})
```

## 📈 Analytics Features

### Creator Dashboard Metrics
- **Total Earnings**: Lifetime earnings across all models
- **Active Models**: Number of models with usage
- **Total Usage**: Combined usage count across all models
- **Average Earnings**: Per-model average earnings
- **Top Models**: Best performing models by earnings
- **Recent Activity**: Latest usage and earnings

### Admin Dashboard Metrics
- **Platform Totals**: Total earnings across all creators
- **Transaction Summary**: Pending, completed, failed counts
- **Creator Performance**: Individual creator earnings
- **Model Analytics**: Model-by-model performance
- **Payout Management**: Transaction creation and management

### Real-time Updates
- **Live Tracking**: Usage logged immediately
- **Dynamic Calculation**: Earnings calculated in real-time
- **Instant Analytics**: Dashboard updates reflect latest data
- **Status Tracking**: Transaction status updates immediately

## 🎨 User Experience

### For Model Creators
- **Earnings Visibility**: Clear view of all earnings and performance
- **Model Analytics**: Detailed performance metrics for each model
- **Usage Trends**: Historical data and growth patterns
- **Payout Tracking**: Status of pending and completed payouts
- **Performance Insights**: Understanding of what drives earnings

### For Administrators
- **Creator Management**: View and manage all creator earnings
- **Transaction Control**: Create and manage payouts
- **Performance Monitoring**: Track platform-wide earnings
- **Financial Oversight**: Complete transaction and payout visibility
- **Analytics Dashboard**: Comprehensive platform analytics

## 🛡️ Security & Data Protection

### Data Security
- **Row Level Security**: Creator data protected by RLS policies
- **Authentication**: All APIs require valid user sessions
- **Authorization**: Creators can only see their own data
- **Admin Access**: Only admins can manage all creator data

### Privacy Protection
- **Metadata Truncation**: Prompts truncated to 100 characters
- **User Anonymization**: User data protected in analytics
- **Secure Storage**: All earnings data encrypted in database
- **Access Control**: Granular permissions for different user types

## 🚀 Performance Optimizations

### Database Optimization
- **Indexed Queries**: Optimized indexes for fast analytics queries
- **Aggregated Data**: Pre-calculated totals for performance
- **Efficient Joins**: Optimized relationships for complex queries
- **Caching Strategy**: Strategic caching for frequently accessed data

### API Performance
- **Batch Operations**: Efficient bulk data operations
- **Async Processing**: Non-blocking usage tracking
- **Error Resilience**: Graceful handling of tracking failures
- **Rate Limiting**: Protection against abuse

## 🔮 Future Enhancements

### Advanced Analytics
- **Predictive Analytics**: Forecast earnings based on trends
- **Comparative Analysis**: Compare model performance
- **Market Insights**: Platform-wide usage patterns
- **Creator Recommendations**: Suggestions for optimization

### Enhanced Features
- **Automated Payouts**: Scheduled payout processing
- **Earnings Goals**: Creator-set earnings targets
- **Performance Alerts**: Notifications for significant changes
- **Advanced Filtering**: More granular analytics filters

### Integration Opportunities
- **External Analytics**: Integration with external analytics tools
- **API Access**: Programmatic access to earnings data
- **Webhook Support**: Real-time notifications for earnings events
- **Export Features**: Data export for external analysis

## 📋 Implementation Checklist

### ✅ Completed Features
- [x] Database schema for usage tracking and earnings
- [x] Dynamic earnings calculation system
- [x] Real-time usage tracking API
- [x] Creator analytics dashboard
- [x] Admin earnings management
- [x] Integration with image generation
- [x] Comprehensive analytics and reporting
- [x] Security and privacy protection
- [x] Performance optimizations

### 🔄 Ready for Production
- [x] All APIs tested and functional
- [x] Database migrations ready
- [x] UI components responsive and accessible
- [x] Error handling comprehensive
- [x] Security measures implemented
- [x] Performance optimizations applied

The usage-based earnings system is now fully implemented and ready for production use! Model creators will earn more as their models become more popular, with comprehensive analytics to track their success and detailed admin tools for platform management.
