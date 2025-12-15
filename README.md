# The Team - Job Search Management Platform

A comprehensive job search management platform built with React, TypeScript, and Supabase.

## Features

- 📋 Job application tracking and management
- 📝 Resume and cover letter builder with AI assistance
- 🎯 Interview preparation and mock interviews
- 👥 Networking and mentor connections
- 📊 Career goal tracking and insights
- 🔗 OAuth integrations (GitHub, LinkedIn, Google)

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **AI**: Google Gemini API
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Create .env.local with your Supabase credentials
echo "VITE_SUPABASE_URL=your-supabase-url" > .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key" >> .env.local

# Start the development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

### Supabase Edge Functions

Edge functions require additional secrets set via Supabase CLI:

```sh
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
npx supabase secrets set APP_URL=https://your-vercel-app.vercel.app
```

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Supabase

```sh
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push database migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy
```

## Documentation

See the `docs/` folder for:
- Environment variables guide
- Deployment runbook
- Troubleshooting guide

## License

MIT
