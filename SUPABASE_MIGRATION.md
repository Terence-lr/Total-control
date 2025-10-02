# Firebase to Supabase Migration Guide

This guide will help you migrate your Total Control app from Firebase to Supabase.

## 🚀 Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2. Set Up Database Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create tables and policies

### 3. Configure Environment Variables
Set these in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

## 📋 Migration Checklist

### ✅ Completed
- [x] Install Supabase dependencies
- [x] Create Supabase configuration
- [x] Set up authentication system
- [x] Create database schema with RLS
- [x] Update main layout provider
- [x] Update deployment configuration

### 🔄 In Progress
- [ ] Update all components to use Supabase
- [ ] Create API routes for server-side operations
- [ ] Test authentication flow
- [ ] Test database operations

### ⏳ Pending
- [ ] Remove Firebase dependencies
- [ ] Update all client components
- [ ] Test AI integration
- [ ] Deploy to Vercel

## 🔧 Key Changes Made

### 1. Dependencies
- **Removed**: Firebase SDK
- **Added**: `@supabase/supabase-js`, `@supabase/ssr`

### 2. Authentication
- **Before**: Firebase Auth with custom hooks
- **After**: Supabase Auth with built-in providers

### 3. Database
- **Before**: Firestore with security rules
- **After**: PostgreSQL with Row Level Security (RLS)

### 4. Environment Variables
- **Before**: Firebase config variables
- **After**: Supabase URL and anon key

## 🗄️ Database Schema

The new schema includes:

### Tables
- `users` - User profiles (linked to auth.users)
- `tasks` - User tasks with priority and due dates
- `flows` - Workflow definitions
- `routines` - Scheduled routines

### Security
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data
- Automatic user profile creation on signup

## 🔐 Security Features

### Row Level Security Policies
- Users can only view/edit their own data
- Automatic user ID filtering
- Secure by default

### Authentication
- Built-in OAuth providers (Google, GitHub, etc.)
- Email/password authentication
- Automatic session management

## 🚀 Next Steps

1. **Test the migration locally:**
   ```bash
   npm run dev
   ```

2. **Update components:**
   - Replace Firebase hooks with Supabase hooks
   - Update data fetching logic
   - Test all CRUD operations

3. **Deploy to Vercel:**
   - Set environment variables
   - Deploy the application
   - Test in production

## 🆘 Troubleshooting

### Common Issues

1. **Authentication not working:**
   - Check Supabase URL and anon key
   - Verify OAuth providers are configured
   - Check browser console for errors

2. **Database access denied:**
   - Ensure RLS policies are created
   - Check user authentication status
   - Verify table permissions

3. **Build failures:**
   - Remove Firebase dependencies
   - Update import statements
   - Check TypeScript errors

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Migration Guide](https://supabase.com/docs/guides/migrate)

## 📊 Performance Benefits

### Supabase Advantages
- **Faster queries**: PostgreSQL vs Firestore
- **Better type safety**: Generated TypeScript types
- **Real-time subscriptions**: Built-in real-time features
- **Edge functions**: Serverless functions at the edge
- **Better pricing**: More predictable costs

### Migration Benefits
- **Unified backend**: Auth + Database + Storage in one platform
- **Better developer experience**: SQL instead of NoSQL
- **More features**: Built-in real-time, edge functions, etc.
- **Better performance**: PostgreSQL is faster than Firestore
