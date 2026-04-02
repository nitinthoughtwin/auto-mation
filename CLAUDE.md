# CLAUDE.md — YouTube Automation Dashboard

## Project Overview

A full-stack SaaS web application for YouTube automation. Users can connect multiple YouTube channels, schedule and bulk-upload videos, import videos from Google Drive, and generate AI-powered metadata (titles, descriptions, tags). Subscription-based with Stripe and Razorpay payment integration.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL via Prisma 6 |
| Auth | NextAuth.js 4 (Google OAuth + credentials) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix UI) |
| State | React Query (server), Zustand (client), React Hook Form |
| Job Queue | BullMQ + Redis (ioredis / Upstash) |
| File Storage | Vercel Blob (prod) / local filesystem (dev) |
| Payments | Stripe + Razorpay |
| AI | Google Gemini (`@google/generative-ai`) |
| Email | Nodemailer |
| Monitoring | Sentry |
| Animation | Framer Motion |
| Charts | Recharts |

## Project Structure

```
src/
├── app/
│   ├── api/              # 79+ API route handlers
│   │   ├── auth/         # Auth flows
│   │   ├── channels/     # YouTube channel management & OAuth
│   │   ├── videos/       # Video upload & management
│   │   ├── drive/        # Google Drive integration
│   │   ├── blob/         # File storage
│   │   ├── scheduler/    # Video upload scheduling
│   │   ├── cron/         # Cron job executor
│   │   ├── video-library/# Video library management
│   │   ├── payment/      # Stripe & Razorpay
│   │   ├── webhooks/     # Payment webhooks
│   │   └── admin/        # Admin endpoints
│   ├── dashboard/        # Main user dashboard
│   ├── channels/[id]/    # Per-channel detail page
│   ├── admin/            # Admin panel pages
│   ├── pricing/          # Pricing page
│   ├── billing/          # Billing management
│   ├── profile/          # User profile
│   ├── settings/         # User settings
│   └── connect-youtube/  # YouTube OAuth flow
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── DriveVideoBrowser.tsx
│   ├── VideoLibraryBrowser.tsx
│   ├── UsageDashboard.tsx
│   └── providers/        # React context providers
├── lib/
│   ├── auth.ts           # NextAuth config + auth logic
│   ├── youtube.ts        # YouTube Data API v3
│   ├── google-drive.ts   # Google Drive API
│   ├── queue.ts          # BullMQ setup
│   ├── email.ts          # Email service
│   ├── db.ts             # Prisma client singleton
│   ├── storage/          # File storage abstraction
│   └── validations.ts    # Zod schemas
└── hooks/                # Custom React hooks
prisma/
└── schema.prisma         # Full database schema
```

## Commands

```bash
# Development
npm install
npm run dev                # Dev server on port 3000

# Database
npm run db:generate        # Generate Prisma client
npm run db:push            # Push schema (dev)
npm run db:migrate         # Run migrations
npm run db:reset           # Reset DB (dev only)

# Build & Production
npm run build              # Build standalone output
npm run start              # Start production server (Bun)

# Lint
npm run lint
```

## Database Schema (Key Models)

- **User** — auth, profile, role
- **Account** — OAuth connections (Google/YouTube)
- **Channel** — YouTube channel + scheduling config
- **Video** — metadata, upload status, Drive storage reference
- **SchedulerLog** — upload execution history
- **Plan / Subscription / Payment / Usage** — billing tier system
- **VideoCategory / LibraryVideo** — admin-managed content library

## Key Architectural Patterns

### Authentication
- Dual providers: Google OAuth and email/password credentials
- JWT sessions with role claims
- All protected API routes check session via `getServerSession`

### API Routes
- All under `src/app/api/` using Next.js App Router conventions
- Input validation with Zod schemas from `src/lib/validations.ts`
- Server-only utilities marked with `'use server'` or `server-only`

### Job Queue
- BullMQ handles background tasks: email, payments, subscription updates, video processing
- Cron endpoint `/api/cron` triggered every 5 minutes by external scheduler

### File Storage
- Abstraction layer in `src/lib/storage/` — local in dev, Vercel Blob in prod
- Videos optionally stored on Google Drive

### Payments
- Stripe for international, Razorpay for India
- Webhook handlers in `/api/webhooks/`
- Plans: Free, Pro, Premium with usage enforcement

## Environment Variables

See `.env.example` for the full list. Critical ones:

```
DATABASE_URL          # PostgreSQL
DIRECT_URL            # For Prisma migrations
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
BLOB_READ_WRITE_TOKEN # Vercel Blob
NEXTAUTH_SECRET
REDIS_URL             # BullMQ queues
STRIPE_SECRET_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_SENTRY_DSN
```

## Deployment

- **Recommended**: Vercel (with Vercel Postgres + Blob)
- **Self-hosted**: Docker + Caddy reverse proxy (port 81 → 3000)
- Cron jobs via cron-job.org or GitHub Actions hitting `/api/cron`
- Function timeouts: 60s for blob/scheduler/cron routes

## Features Summary

1. Connect and manage multiple YouTube channels
2. Bulk video upload with optional thumbnails
3. Flexible scheduling (daily, every N days, weekly) with timezone support
4. Google Drive integration for video storage and import
5. AI-generated titles, descriptions, and tags (Gemini)
6. Admin panel: user management, plans, video library, payments
7. Subscription billing with Stripe + Razorpay
8. Email verification and password reset flows
9. Instagram/Facebook connections (in progress)
