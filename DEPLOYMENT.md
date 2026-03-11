# YouTube Automation Dashboard - Vercel Deployment Guide

## Prerequisites

1. **GitHub Account** - To connect your repository to Vercel
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Google Cloud Console** - For YouTube API credentials
4. **PostgreSQL Database** - Vercel Postgres, Neon, or Supabase

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

---

## Step 2: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database"
3. Select "Postgres"
4. Name your database and select region
5. Click "Create"
6. Copy the connection string (DATABASE_URL)

### Option B: Neon (Free Tier Available)

1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string

### Option C: Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the connection string (use port 5432)

---

## Step 3: Deploy to Vercel

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
   | `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host/db?sslmode=require` |
   | `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxx` |
   | `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://your-app.vercel.app/api/auth/youtube/callback` |

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your deployed app!

---

## Step 4: Configure Vercel Cron Jobs

The `vercel.json` file includes a cron job that runs every 5 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This automatically checks for scheduled uploads.

**Important**: Vercel Cron Jobs are only available on Pro plans. For free tier, use external cron services:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://easycron.com)
- GitHub Actions

---

## Step 5: First-Time Setup

1. Visit your deployed app
2. Create your admin account (first user only)
3. Login with your credentials
4. Connect your YouTube channel
5. Start uploading videos!

---

## Important Notes for Production

### File Storage Limitation

**⚠️ Vercel has ephemeral filesystem** - uploaded files won't persist between requests.

**For production use, consider:**

1. **Vercel Blob Storage** (Recommended)
   - Add `@vercel/blob` package
   - Store video files in Blob
   - Download before YouTube upload

2. **External Storage Services**
   - AWS S3
   - Cloudflare R2
   - Google Cloud Storage

### Database Migrations

Run migrations after first deploy:

```bash
# In Vercel dashboard → Settings → Environment Variables
# Make sure DATABASE_URL is set

# Use Vercel CLI for one-time migration
npx prisma migrate deploy
```

Or use `prisma db push` for development:

```bash
npx prisma db push
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | ✅ Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ Yes | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | ✅ Yes | OAuth callback URL (production URL) |
| `BLOB_READ_WRITE_TOKEN` | ⭕ Optional | Vercel Blob token for file storage |

---

## Troubleshooting

### Build Errors

1. **Prisma Generation Failed**
   ```bash
   # Add to package.json scripts
   "postinstall": "prisma generate"
   ```

2. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure SSL mode is enabled
   - Whitelist Vercel IPs if needed

### OAuth Errors

1. **Redirect URI Mismatch**
   - Add production URL to Google Cloud Console
   - Update `GOOGLE_REDIRECT_URI` env var

2. **Token Refresh Failed**
   - Ensure offline access is enabled
   - Re-connect YouTube channel

### Cron Not Working

1. **Free Plan Limitation**
   - Vercel Cron requires Pro plan
   - Use external cron services instead

---

## Next Steps

1. Set up file storage (Vercel Blob or external)
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Enable Vercel Analytics

---

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)