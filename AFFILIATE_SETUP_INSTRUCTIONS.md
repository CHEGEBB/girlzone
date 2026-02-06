# 🚀 Affiliate System Setup Instructions

## ✅ What's Already Done

The affiliate system has been fully implemented and integrated into your application:

- ✅ **Database Schema** - Complete SQL schema with all tables, functions, and policies
- ✅ **API Endpoints** - All affiliate management APIs are ready
- ✅ **User Interface** - Complete dashboard and admin management interface
- ✅ **Navigation** - Added to both user and admin sidebars
- ✅ **Tracking System** - Automatic click and conversion tracking
- ✅ **TypeScript Types** - Updated Supabase types for affiliate tables

## 🗄️ Database Setup Required

To complete the setup, you need to run the database SQL script:

### Option 1: Use the Admin Interface (Recommended)
1. **Start your development server**: `npm run dev`
2. **Go to**: `http://localhost:3000/admin/database-setup/affiliate`
3. **Copy the SQL script** using the copy button
4. **Open your Supabase dashboard** → SQL Editor
5. **Paste and run** the SQL script
6. **Test the setup** using the test button on the same page

### Option 2: Manual Setup
1. **Open**: `supabase/affiliate_system.sql`
2. **Copy the entire SQL script**
3. **Go to your Supabase dashboard** → SQL Editor
4. **Paste and execute** the script

### Option 3: Test API Endpoint
1. **Start your development server**: `npm run dev`
2. **Visit**: `http://localhost:3000/api/affiliate/test`
3. **Check the response** - it will tell you what's missing

## 🎯 How to Use

### For Users (Affiliates)
1. **Visit**: `/affiliate` to apply for the program
2. **Get approved** by an admin
3. **Access dashboard** to view stats and generate links
4. **Share affiliate links** to earn commissions

### For Admins
1. **Visit**: `/admin/affiliate` to manage affiliates
2. **Review applications** and approve/reject affiliates
3. **Monitor performance** and manage payouts
4. **Set commission rates** and program settings

## 🔗 Affiliate Link Format

Affiliate links work automatically with this format:
```
https://yoursite.com?ref=AFFILIATE123&type=character
```

- `ref` = affiliate code
- `type` = link type (general, character, premium, custom)

## 📊 Features Included

### For Affiliates:
- ✅ Application system
- ✅ Comprehensive dashboard
- ✅ Link generation and management
- ✅ Real-time tracking
- ✅ Commission history
- ✅ Performance analytics

### For Admins:
- ✅ Application review system
- ✅ Performance monitoring
- ✅ Commission management
- ✅ Payout processing
- ✅ Detailed analytics

### Technical Features:
- ✅ Automatic click tracking
- ✅ Cookie-based attribution (30 days)
- ✅ Real-time commission calculation
- ✅ Secure database with RLS
- ✅ Performance optimized

## 🧪 Testing

After setup, test the system:

1. **Apply for affiliate program**: Visit `/affiliate`
2. **Approve application**: Go to `/admin/affiliate`
3. **Generate affiliate link**: Use the dashboard
4. **Test tracking**: Click the affiliate link
5. **Verify data**: Check the admin dashboard

## 📚 Documentation

Complete documentation is available in: `docs/AFFILIATE_SYSTEM.md`

## 🆘 Troubleshooting

### Database Connection Issues
- Check your Supabase environment variables
- Verify the SQL script ran successfully
- Use the test endpoint: `/api/affiliate/test`

### Permission Issues
- Ensure you have admin access
- Check RLS policies are properly set up
- Verify user authentication

### Tracking Issues
- Check middleware is working
- Verify affiliate codes are valid
- Ensure cookies are enabled

## 🎉 You're Ready!

Once the database is set up, your affiliate system will be fully functional. Users can start applying, and you can manage them through the admin interface.

The system will automatically:
- Track clicks and conversions
- Calculate commissions
- Provide detailed analytics
- Handle payouts

**Happy affiliate marketing!** 🚀
