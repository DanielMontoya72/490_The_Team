import { FileText, Server, Rocket, Settings, AlertTriangle, History, Phone, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const Documentation = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Production Documentation</h1>
        <p className="text-muted-foreground">Comprehensive guides for maintaining and troubleshooting production systems</p>
      </div>

      <Tabs defaultValue="architecture" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="architecture" className="gap-2">
            <Server className="h-4 w-4" />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="deployment" className="gap-2">
            <Rocket className="h-4 w-4" />
            Deployment
          </TabsTrigger>
          <TabsTrigger value="environment" className="gap-2">
            <Settings className="h-4 w-4" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="troubleshooting" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Troubleshooting
          </TabsTrigger>
          <TabsTrigger value="changelog" className="gap-2">
            <History className="h-4 w-4" />
            Changelog
          </TabsTrigger>
          <TabsTrigger value="oncall" className="gap-2">
            <Phone className="h-4 w-4" />
            On-Call
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Bell className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architecture">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Production Architecture
              </CardTitle>
              <CardDescription>System architecture and component diagrams</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>System Overview</h2>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">{`
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Browser   │  │   Mobile    │  │   PWA       │              │
│  │   (React)   │  │   Browser   │  │   Cache     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CDN / EDGE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Cloud Hosting (Cloudflare)                  │    │
│  │  • Static asset caching    • Gzip compression           │    │
│  │  • SSL termination         • DDoS protection            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 React SPA (Vite)                         │    │
│  │  • React 18 with Suspense  • React Router v6            │    │
│  │  • TanStack Query          • Lazy-loaded routes         │    │
│  │  • Tailwind CSS            • Shadcn/ui components       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Supabase Auth   │  │  Edge Functions  │                     │
│  │  • JWT tokens    │  │  • Deno runtime  │                     │
│  │  • OAuth         │  │  • Auto-scaling  │                     │
│  │  • RLS policies  │  │  • API endpoints │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   PostgreSQL     │  │  Supabase        │                     │
│  │   Database       │  │  Storage         │                     │
│  │  • RLS enabled   │  │  • File uploads  │                     │
│  │  • Auto backups  │  │  • CDN delivery  │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                  `}</pre>

                  <h2>Component Architecture</h2>
                  <h3>Frontend Components</h3>
                  <ul>
                    <li><strong>Pages</strong>: Route-level components with lazy loading</li>
                    <li><strong>Components</strong>: Reusable UI components (Shadcn/ui)</li>
                    <li><strong>Hooks</strong>: Custom React hooks for data fetching</li>
                    <li><strong>Lib</strong>: Utility functions and configurations</li>
                    <li><strong>Integrations</strong>: Third-party service integrations</li>
                  </ul>

                  <h3>Backend Services</h3>
                  <ul>
                    <li><strong>Authentication</strong>: Supabase Auth with JWT</li>
                    <li><strong>Database</strong>: PostgreSQL with Row Level Security</li>
                    <li><strong>Edge Functions</strong>: Serverless API endpoints</li>
                    <li><strong>Storage</strong>: File storage with access policies</li>
                    <li><strong>Realtime</strong>: WebSocket subscriptions</li>
                  </ul>

                  <h2>Data Flow</h2>
                  <pre className="bg-muted p-4 rounded-lg text-xs">{`
User Action → React Component → TanStack Query → Supabase Client → Edge/DB → Response → UI Update
                  `}</pre>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Deployment Runbook
              </CardTitle>
              <CardDescription>Step-by-step deployment procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>Standard Deployment</h2>
                  <ol>
                    <li><strong>Pre-deployment</strong>: Verify all tests pass, review changes</li>
                    <li><strong>Deploy</strong>: Click "Publish" → "Update" in the platform</li>
                    <li><strong>Verify</strong>: Check live site, run smoke tests</li>
                    <li><strong>Monitor</strong>: Watch error rates for 15 minutes</li>
                  </ol>

                  <h2>Database Migration</h2>
                  <ol>
                    <li>Review migration SQL in the chat interface</li>
                    <li>Click "Apply Migration" when prompted</li>
                    <li>Verify table changes in Cloud → Database</li>
                    <li>Test affected features</li>
                  </ol>

                  <h2>Edge Function Deployment</h2>
                  <p>Edge functions deploy automatically when code changes. To manually deploy:</p>
                  <ol>
                    <li>Make changes to function code</li>
                    <li>Functions deploy on save</li>
                    <li>Check logs in Cloud → Edge Functions</li>
                  </ol>

                  <h2>Rollback Procedure</h2>
                  <ol>
                    <li>Go to Project History (clock icon)</li>
                    <li>Find last stable version</li>
                    <li>Click "Restore to this version"</li>
                    <li>Re-publish the application</li>
                  </ol>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Environment Variables
              </CardTitle>
              <CardDescription>Configuration and secrets management</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>Auto-Configured Variables</h2>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Variable</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>VITE_SUPABASE_URL</code></td>
                        <td>Supabase project URL</td>
                      </tr>
                      <tr>
                        <td><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></td>
                        <td>Supabase anon key</td>
                      </tr>
                      <tr>
                        <td><code>VITE_SUPABASE_PROJECT_ID</code></td>
                        <td>Supabase project ID</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2>User-Configured Secrets</h2>
                  <p>Manage in Project Settings → Secrets:</p>
                  <ul>
                    <li><code>VITE_SENTRY_DSN</code> - Error tracking</li>
                    <li><code>SMTP_*</code> - Email configuration</li>
                    <li><code>LINKEDIN_*</code> - OAuth credentials</li>
                    <li><code>GITHUB_*</code> - OAuth credentials</li>
                    <li><code>BLS_API_KEY</code> - Salary data API</li>
                  </ul>

                  <h2>Adding New Secrets</h2>
                  <ol>
                    <li>Go to Project Settings → Secrets</li>
                    <li>Click "Add Secret"</li>
                    <li>Enter name and value</li>
                    <li>Redeploy edge functions if needed</li>
                  </ol>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Troubleshooting Guide
              </CardTitle>
              <CardDescription>Common issues and solutions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>Authentication Issues</h2>
                  <h3>Users can't log in</h3>
                  <ul>
                    <li>Check auth logs in Cloud → Users</li>
                    <li>Verify email confirmation settings</li>
                    <li>Check for rate limiting</li>
                  </ul>

                  <h2>Database Issues</h2>
                  <h3>Queries returning empty</h3>
                  <ul>
                    <li>Check RLS policies are correct</li>
                    <li>Verify user is authenticated</li>
                    <li>Check 1000-row query limit</li>
                  </ul>

                  <h2>Edge Function Issues</h2>
                  <h3>Function returning 500</h3>
                  <ul>
                    <li>Check function logs in Cloud</li>
                    <li>Verify all secrets are configured</li>
                    <li>Check for timeout (max 60s)</li>
                  </ul>

                  <h2>Performance Issues</h2>
                  <h3>Slow page loads</h3>
                  <ul>
                    <li>Run Lighthouse audit</li>
                    <li>Check /monitoring for metrics</li>
                    <li>Verify lazy loading is working</li>
                  </ul>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Changelog
              </CardTitle>
              <CardDescription>Production update history</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>[2025-12-11] - Performance & Documentation</h2>
                  <h3>Added</h3>
                  <ul>
                    <li>Performance monitoring dashboard</li>
                    <li>Web Vitals tracking</li>
                    <li>Comprehensive production documentation</li>
                    <li>Code splitting for all routes</li>
                  </ul>

                  <h2>[2025-12-10] - Monitoring & Logging</h2>
                  <h3>Added</h3>
                  <ul>
                    <li>Sentry error tracking integration</li>
                    <li>Structured logging utility</li>
                    <li>API monitoring with metrics</li>
                    <li>Monitoring dashboard at /monitoring</li>
                  </ul>

                  <h2>[2025-12-09] - Feature Completions</h2>
                  <h3>Added</h3>
                  <ul>
                    <li>Multi-platform application tracking</li>
                    <li>A/B testing dashboard</li>
                    <li>Career path simulation</li>
                    <li>Job offer comparison</li>
                  </ul>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oncall">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                On-Call Procedures
              </CardTitle>
              <CardDescription>Incident response and escalation</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>Severity Levels</h2>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Description</th>
                        <th>Response Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-destructive font-bold">P1 - Critical</td>
                        <td>Complete outage</td>
                        <td>15 minutes</td>
                      </tr>
                      <tr>
                        <td className="text-orange-500 font-bold">P2 - High</td>
                        <td>Major feature broken</td>
                        <td>1 hour</td>
                      </tr>
                      <tr>
                        <td className="text-yellow-500 font-bold">P3 - Medium</td>
                        <td>Minor feature affected</td>
                        <td>4 hours</td>
                      </tr>
                      <tr>
                        <td className="text-muted-foreground">P4 - Low</td>
                        <td>Cosmetic issues</td>
                        <td>Next business day</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2>Incident Response Steps</h2>
                  <ol>
                    <li><strong>Acknowledge</strong>: Confirm you're investigating</li>
                    <li><strong>Assess</strong>: Determine severity and impact</li>
                    <li><strong>Communicate</strong>: Update stakeholders</li>
                    <li><strong>Mitigate</strong>: Apply immediate fixes or rollback</li>
                    <li><strong>Resolve</strong>: Implement permanent fix</li>
                    <li><strong>Review</strong>: Post-incident analysis</li>
                  </ol>

                  <h2>Escalation Path</h2>
                  <ol>
                    <li>Primary on-call engineer</li>
                    <li>Secondary on-call engineer</li>
                    <li>Engineering lead</li>
                    <li>Executive team (P1 only)</li>
                  </ol>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Monitoring & Alerting Setup
              </CardTitle>
              <CardDescription>System monitoring configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h2>Monitoring Stack</h2>
                  <ul>
                    <li><strong>Error Tracking</strong>: Sentry</li>
                    <li><strong>Performance</strong>: Web Vitals + Custom metrics</li>
                    <li><strong>Uptime</strong>: UptimeRobot (recommended)</li>
                    <li><strong>Logs</strong>: Browser console + Supabase logs</li>
                  </ul>

                  <h2>Key Metrics</h2>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Target</th>
                        <th>Alert Threshold</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>LCP</td>
                        <td>&lt; 2.5s</td>
                        <td>&gt; 4s</td>
                      </tr>
                      <tr>
                        <td>INP</td>
                        <td>&lt; 200ms</td>
                        <td>&gt; 500ms</td>
                      </tr>
                      <tr>
                        <td>CLS</td>
                        <td>&lt; 0.1</td>
                        <td>&gt; 0.25</td>
                      </tr>
                      <tr>
                        <td>TTFB</td>
                        <td>&lt; 600ms</td>
                        <td>&gt; 1s</td>
                      </tr>
                      <tr>
                        <td>Error Rate</td>
                        <td>&lt; 0.1%</td>
                        <td>&gt; 1%</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2>Dashboard Access</h2>
                  <ul>
                    <li><strong>/monitoring</strong> - Internal metrics dashboard</li>
                    <li><strong>Sentry Dashboard</strong> - Error tracking</li>
                    <li><strong>Cloud → Edge Functions</strong> - Function logs</li>
                  </ul>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documentation;
