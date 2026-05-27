# Alpha Fuel Manager

A cutting-edge fuel dealer payment and sales management platform for the Kenyan market.

## Quick Start

1. cd app && npm install
2. Copy .env.local.example to .env.local and fill in Supabase credentials
3. Run database migrations (see app/supabase/README.md)
4. npm run dev

## Vercel Deployment

Connect this GitHub repo to Vercel. Set Root Directory to pp. Add environment variables in Vercel dashboard.

## Tech Stack
- Next.js 14 App Router + TypeScript
- Supabase (PostgreSQL, Edge Functions, Realtime, Vault)
- Tailwind CSS + shadcn/ui
- Safaricom Daraja API v2 (M-Pesa)
- Africa's Talking / Twilio (SMS)
