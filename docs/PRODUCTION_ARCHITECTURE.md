# Production Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    React SPA (Vite + TypeScript)                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Pages   │ │Components│ │  Hooks   │ │ Context  │ │  Utils   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL HOSTING (CDN)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Global CDN Distribution    • SSL/TLS Termination                  │   │
│  │  • Gzip/Brotli Compression    • Browser Caching                      │   │
│  │  • Static Asset Serving       • Automatic Deployments                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE CLOUD                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Database   │  │     Auth     │  │   Storage    │  │Edge Functions│   │
│  │  PostgreSQL  │  │   JWT/OAuth  │  │    S3-like   │  │  Deno Runtime│   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                 │                 │                 │            │
│         ▼                 ▼                 ▼                 ▼            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Row Level Security (RLS)                      │   │
│  │                     Data Protection & Access Control                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  Sentry  │ │  Gmail   │ │ LinkedIn │ │  GitHub  │ │  Google  │         │
│  │  Errors  │ │   SMTP   │ │  OAuth   │ │  OAuth   │ │  OAuth   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI rendering and state management |
| Build Tool | Vite 5 | Fast bundling and HMR |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | Shadcn/UI + Radix | Accessible component library |
| State Management | TanStack Query | Server state caching |
| Routing | React Router v6 | Client-side navigation |
| Forms | React Hook Form + Zod | Form handling and validation |

### Backend Layer (Supabase)

| Service | Purpose | Configuration |
|---------|---------|---------------|
| PostgreSQL | Primary database | Managed by Supabase |
| Auth | Authentication | Email, Google, LinkedIn, GitHub OAuth |
| Storage | File storage | profile-pictures, application-materials buckets |
| Edge Functions | Serverless logic | Deno runtime, auto-scaling |
| Realtime | WebSocket subscriptions | Enabled for specific tables |

### Data Flow

```
User Action → React Component → TanStack Query → Supabase Client → Edge Function/Database
     ↑                                                                      │
     └──────────────────────── Response ←───────────────────────────────────┘
```

## Security Architecture

### Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  Supabase│───▶│   JWT    │───▶│  Client  │
│  Form    │    │   Auth   │    │  Token   │    │  Storage │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐
              │  OAuth   │ (Google, LinkedIn, GitHub)
              │ Providers│
              └──────────┘
```

### Row Level Security (RLS)

- All tables have RLS enabled
- Policies enforce user-based data access
- Service role bypasses RLS for edge functions
- Anonymous access blocked by default

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                               │
│  Local Dev → Git Push → Vercel Preview → Review                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
│  Merge to Main → Auto Build → CDN Deploy → Edge Functions       │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

| Metric | Target | Monitoring |
|--------|--------|------------|
| LCP | < 2.5s | Web Vitals |
| FID/INP | < 200ms | Web Vitals |
| CLS | < 0.1 | Web Vitals |
| TTFB | < 600ms | Performance Monitor |
| Error Rate | < 0.1% | Sentry |

## Scaling Considerations

- **Frontend**: CDN handles global distribution automatically
- **Database**: Supabase auto-scales based on usage
- **Edge Functions**: Serverless, scales to zero and up automatically
- **Storage**: S3-compatible, unlimited capacity
