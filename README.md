# The Team - Professional Job Search Platform

A comprehensive job search management platform built with React, TypeScript, and Supabase.
By: Maria Angel Palacios, Anastasia Baylis, Massa Belal, Matthew O'Mara

A comprehensive job search management platform with AI-powered features for application tracking, resume building, cover letter generation, interview preparation, and career analytics.

**Live URL**: https://theats.it.com/

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database & Edge Functions)
- Google Gemini AI

## How to Run Locally

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies
npm i

# Step 4: Create a .env.local file with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Step 5: Start the development server
npm run dev
```

## Editing Options

**Edit locally with your preferred IDE**

Clone this repo and push changes. The development server supports hot module replacement for instant previews.

**Edit directly in GitHub**

- Navigate to the desired file(s)
- Click the "Edit" button (pencil icon) at the top right
- Make your changes and commit

**Use GitHub Codespaces**

- Navigate to the main page of your repository
- Click on the "Code" button (green button)
- Select the "Codespaces" tab
- Click "New codespace" to launch a development environment

## Deployment

The project is deployed on Vercel with continuous deployment from the main branch.

To deploy your own instance:
1. Fork this repository
2. Connect to Vercel
3. Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
4. Deploy

## Supabase Setup

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

## Environment Variables

See `docs/ENVIRONMENT_VARIABLES.md` for a complete list of required environment variables.

## License

MIT

## AI Agent Credits
Credits to the AI Agents that helped us build this application:
- GitHub CoPilot
- Claude Opus 4.5
- Google Gemini
- Cursor
- Lovable
