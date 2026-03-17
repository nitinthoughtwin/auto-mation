1. Facebook connect (app review)
2. instagram connect (app review)
3. Google drive folder access and map
4. Google youtube only 6 video uploads.(fix somethings)
5. Test with multiple youtube, facebook and instagram


# YouTube Automation Dashboard

A powerful, feature-rich dashboard for managing YouTube channels, scheduling uploads, and automating video publishing to Built with Next.js 16, React 19, Tailwind CSS 4, and Prisma ORM for and shadcn/ui component library.

## ✨ Features

### 🎬 Channel Management
- Connect multiple YouTube channels via OAuth - Monitor channel status (active/paused)
- View per-channel statistics and upload history

### 📹 Video Upload
- Bulk upload multiple videos at once
- **Optional thumbnail support** for each video
- Auto-generate titles from filenames
- Queue management with status tracking

### ⏰ Smart Scheduling
- Multiple frequency options:
  - Daily (one video per day)
  - Every 2nd day
  - Every 3rd day
  - Every 5th day
  - Every Sunday
- AM/PM time picker for easy scheduling
- 5-minute upload window for accurate timing

### 🔐 Authentication
- Static user login system
- One-time setup for admin account
- Secure session management with HTTP-only cookies

### 📊 Dashboard
- Overview of all channels and videos, and scheduler logs
- Quick access to channel management and Real-time statistics

## 🚀 Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres, Neon, Supabase)
- **API Integration**: YouTube Data API v3

## 📦 Project Structure

```
youtube-automation/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main dashboard UI
│   │   ├── layout.tsx      # Root layout
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── youtube/   # YouTube OAuth
│   │       │   ├── login/     # User login
│   │       │   ├── logout/    # User logout
│   │       │   ├── session/  # Session check
│   │       │   └── setup/     # First-time setup
│   │       ├── channels/   # Channel CRUD
│   │       ├── videos/     # Video management
│   │       ├── scheduler/  # Manual scheduler
│   │       └── cron/       # External cron endpoint
│   ├── components/
│   │   └── ui/          # shadcn/ui components
│   └── lib/
│       ├── db.ts           # Prisma client
│       ├── youtube.ts      # YouTube API functions
│       └── scheduler.ts    # Upload scheduler logic
├── uploads/                # File storage (local dev only)
├── .env.example              # Environment variables template
├── vercel.json              # Vercel configuration
└── DEPLOYMENT.md           # Deployment guide
```

## 🛠️ Requirements

- Node.js 18+ 
- YouTube Data API v3 access
- Google OAuth credentials
- PostgreSQL database

## 📖 License

MIT License

## 🙏 Credits

- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)