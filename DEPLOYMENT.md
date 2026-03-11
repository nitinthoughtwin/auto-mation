# YouTube Automation Dashboard - Vercel Deployment Guide

## 🚨 IMPORTANT: Vercel Storage Limitations

**Vercel has ephemeral filesystem** - files stored locally will be DELETED after each deployment or function timeout!

### You MUST configure Vercel Blob Storage for production:

1. Go to Vercel Dashboard → Your Project → **Storage**
2. Click **Create Database** → Select **Blob**
3. Name it `youtube-videos` and select your region
4. Click **Create**
5. Copy the `BLOB_READ_WRITE_TOKEN` to your environment variables

Without Blob storage, uploaded videos will be lost and uploads to YouTube will fail!

---

## Prerequisites

1. **GitHub Account** - To connect your repository to Vercel
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Google Cloud Console** - For YouTube API credentials
4. **PostgreSQL Database** - Vercel Postgres, Neon, or Prisma Data Platform
5. **Vercel Blob Storage** - For persistent file storage

---

## Step 1: Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3:
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/youtube/callback` (local dev)
     - `https://your-app-name.vercel.app/api/auth/youtube/callback` (production)
   - Copy **Client ID** and **Client Secret**

5. Configure OAuth Consent Screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Fill in app name, support email, developer email
   - Add privacy policy URL: `https://your-app.vercel.app/privacy`
   - Add terms URL: `https://your-app.vercel.app/terms`
   - Add yourself as a **Test User** (important!)

---

## Step 2: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database"
3. Select "Postgres"
4. Name your database and select region
5. Click "Create"
6. The `DATABASE_URL` will be automatically added to your project

### Option B: Neon (Free Tier Available)

1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string

### Option C: Prisma Data Platform

1. Go to [prisma.io](https://prisma.io)
2. Create a project and get your database URL

---

## Step 3: Set Up Vercel Blob Storage (CRITICAL)

1. In Vercel Dashboard, go to your project
2. Click **Storage** → **Create Database**
3. Select **Blob**
4. Name: `youtube-videos`
5. Region: Select closest to your users
6. Click **Create**
7. The `BLOB_READ_WRITE_TOKEN` will be automatically added to your environment

---

## Step 4: Deploy to Vercel

### Method 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/youtube-automation)

### Method 2: Manual Deploy

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/youtube-automation.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   
   Add these environment variables in Vercel:
   
   | Variable | Description | Example |
   |----------|-------------|---------|
   | `DATABASE_URL` | PostgreSQL connection string | Auto-added with Vercel Postgres |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | Auto-added with Blob storage |
   | `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxx` |
   | `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://your-app.vercel.app/api/auth/youtube/callback` |

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your deployed app!

---

## Step 5: Initialize Database Tables

After deploying, you need to create the database tables:

### Method 1: Run Locally with Production URL

```bash
# Set your production database URL
export DATABASE_URL="postgres://user:pass@host/db?sslmode=require"

# Switch schema to PostgreSQL first (edit prisma/schema.prisma)
# Then run:
npx prisma generate
npx prisma db push
```

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Pull environment
vercel env pull .env.production

# Run migrations
npx prisma db push
```

### Method 3: API Endpoint

Visit once after deploying:
```
https://your-app.vercel.app/api/setup-database
```

---

## Step 6: Configure Cron Jobs (Scheduling)

Vercel Cron Jobs require Pro plan. For free tier, use external services:

### Using cron-job.org (Free, Recommended)

1. Go to [cron-job.org](https://cron-job.org) and create account
2. Create a new cron job:
   - **Title:** YouTube Automation Scheduler
   - **URL:** `https://your-app.vercel.app/api/cron`
   - **Schedule:** Every 5 minutes (`*/5 * * * *`)
   - **Request Method:** GET
3. Save and enable

### Using GitHub Actions

Create `.github/workflows/cron.yml`:

```yaml
name: Scheduled Uploads

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: curl "${{ secrets.APP_URL }}/api/cron"
```

---

## Step 7: First-Time Setup

1. Visit your deployed app
2. Create your admin account
3. Login with your credentials
4. Connect your YouTube channel
5. Upload videos!

---

## Troubleshooting

### "ENOENT: no such file or directory"

**Problem:** File storage not working
**Solution:** Configure Vercel Blob Storage (see Step 3)

### "Error 400: invalid_request" (Google OAuth)

**Problem:** OAuth not configured properly
**Solution:** 
1. Add yourself as Test User in Google Cloud Console
2. Ensure redirect URI matches exactly
3. Add privacy policy and terms URLs

### "Database connection failed"

**Problem:** Database not reachable
**Solution:** Check DATABASE_URL format and ensure SSL mode is enabled

### Files disappearing after upload

**Problem:** Using local filesystem on Vercel
**Solution:** Configure Vercel Blob Storage with `BLOB_READ_WRITE_TOKEN`

---

## Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `BLOB_READ_WRITE_TOKEN` - For file storage on Vercel
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `GOOGLE_REDIRECT_URI` - Your callback URL

---

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://prisma.io/docs)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)