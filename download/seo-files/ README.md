# SEO Fix Instructions for GPMart.in

## Files to Add in Your Project

Copy these files to your GitHub repository:

### 1. `public/robots.txt`
Copy `robots.txt` to `public/robots.txt`

### 2. `public/sitemap.xml`
Copy `sitemap.xml` to `public/sitemap.xml`

### 3. `vercel.json`
Copy `vercel.json` to project root (same level as package.json)

### 4. `src/app/not-found.tsx`
Copy `not-found.tsx` to `src/app/not-found.tsx`

### 5. Update `src/app/layout.tsx`
Replace your existing layout.tsx with the provided `layout.tsx`

---

## Google Search Console Fix Steps

### Step 1: Remove Old URLs
1. Go to https://search.google.com/search-console
2. Select your property (gpmart.in)
3. Go to **Index > Removals**
4. Click **New Request**
5. Enter old URLs one by one to remove

### Step 2: Submit New Sitemap
1. In Google Search Console, go to **Sitemaps**
2. Enter sitemap URL: `sitemap.xml`
3. Click **Submit**

### Step 3: Request Indexing
1. Use **URL Inspection** tool
2. Enter `https://gpmart.in`
3. Click **Request Indexing**

### Step 4: Add Verification Code
1. In Google Search Console, go to **Settings > Ownership verification**
2. Copy your verification code
3. Add it in `layout.tsx` at: `google: 'YOUR_GOOGLE_VERIFICATION_CODE'`

---

## Redirect Old URLs (Optional)

If you know old website URLs, add redirects in `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: '/old-page-name',
      destination: '/',
      permanent: true, // 308 = permanent redirect
    },
    // Add more old URLs here
  ];
},
```

---

## After Deploying Changes

1. **Clear Vercel Cache**: Go to Vercel Dashboard > Project > Deployments > Redeploy
2. **Test URLs**: Check that `/robots.txt` and `/sitemap.xml` are accessible
3. **Wait 1-2 weeks** for Google to reindex

---

## Server Error (5xx) Fix

If you see 5xx errors:

1. Check Vercel Dashboard > Project > Functions tab
2. Look for any function errors
3. Check if environment variables are set:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

## Need Help?

If you need to add more old URL redirects, share the list of 404 URLs from Google Search Console.