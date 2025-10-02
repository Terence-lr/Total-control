# Vercel Deployment Guide

This guide will help you deploy your Total Control app to Vercel.

## Prerequisites

1. A Vercel account
2. A Supabase project with PostgreSQL database
3. A Google AI API key for Genkit functionality

## Environment Variables

Set the following environment variables in your Vercel project settings:

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### Optional Environment Variables

```
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Deployment Steps

1. **Connect your repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure environment variables:**
   - In your Vercel project dashboard
   - Go to Settings > Environment Variables
   - Add all the required environment variables listed above

3. **Deploy:**
   - Vercel will automatically detect this as a Next.js project
   - The build will use the `vercel-build` script defined in package.json
   - Your app will be deployed and available at your Vercel URL

## Supabase Database Setup

The included `supabase-schema.sql` file contains the complete database schema with:
- Row Level Security (RLS) policies
- User authentication integration
- Automatic user profile creation
- Secure data access controls

Run this SQL in your Supabase SQL editor to set up the database:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create tables and policies

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test user authentication flow
- [ ] Test AI functionality (Genkit flows)
- [ ] Verify Supabase database schema is deployed
- [ ] Test all major app features
- [ ] Check console for any errors

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check that all environment variables are set
   - Ensure TypeScript compilation passes
   - Verify all dependencies are installed

2. **Supabase Connection Issues:**
   - Verify Supabase configuration environment variables
   - Check Supabase project settings
   - Ensure database is properly set up with the schema

3. **AI/Genkit Issues:**
   - Verify GOOGLE_AI_API_KEY is set correctly
   - Check Google AI API quotas and billing

### Performance Optimization

The app is configured with:
- Image optimization for external domains
- Package import optimization
- Compression enabled
- Proper caching headers

## Support

If you encounter issues during deployment, check:
1. Vercel deployment logs
2. Browser console for client-side errors
3. Supabase dashboard for database issues
4. Google AI API console for AI-related issues
