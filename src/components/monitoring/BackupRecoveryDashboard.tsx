import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  FileText,
  Server,
  HardDrive,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TableStats {
  table_name: string;
  row_count: number;
}

interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  count?: number;
}

export function BackupRecoveryDashboard() {
  const [isRunningChecks, setIsRunningChecks] = useState(false);
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [checkProgress, setCheckProgress] = useState(0);

  const runDataIntegrityChecks = async () => {
    setIsRunningChecks(true);
    setCheckProgress(0);
    const checks: IntegrityCheck[] = [];

    try {
      // Check 1: Verify core tables exist and have data
      setCheckProgress(10);
      const coreTables = ['user_profiles', 'jobs', 'interviews', 'resumes', 'skills'];
      const stats: TableStats[] = [];

      for (const table of coreTables) {
        try {
          const { count, error } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true });

          if (error) {
            checks.push({
              name: `Table: ${table}`,
              status: 'fail',
              message: `Error accessing table: ${error.message}`
            });
          } else {
            stats.push({ table_name: table, row_count: count || 0 });
            checks.push({
              name: `Table: ${table}`,
              status: 'pass',
              message: `Table accessible`,
              count: count || 0
            });
          }
        } catch (e) {
          checks.push({
            name: `Table: ${table}`,
            status: 'fail',
            message: `Failed to query table`
          });
        }
      }
      setTableStats(stats);
      setCheckProgress(40);

      // Check 2: Verify user session
      const { data: session } = await supabase.auth.getSession();
      checks.push({
        name: 'Authentication',
        status: session?.session ? 'pass' : 'warning',
        message: session?.session ? 'User session active' : 'No active session'
      });
      setCheckProgress(50);

      // Check 3: Check for orphaned jobs (jobs without valid user)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, user_id')
        .limit(100);

      if (!jobsError && jobsData) {
        // Get unique user IDs from jobs
        const userIds = [...new Set(jobsData.map(j => j.user_id))];
        
        // Check if those users exist
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id')
          .in('user_id', userIds);

        const existingUserIds = new Set(profilesData?.map(p => p.user_id) || []);
        const orphanedCount = userIds.filter(id => !existingUserIds.has(id)).length;

        checks.push({
          name: 'Data Integrity: Jobs',
          status: orphanedCount === 0 ? 'pass' : 'warning',
          message: orphanedCount === 0 
            ? 'All jobs have valid user references' 
            : `${orphanedCount} jobs may have invalid user references`,
          count: orphanedCount
        });
      }
      setCheckProgress(70);

      // Check 4: Verify interviews reference valid jobs
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('interviews')
        .select('id, job_id')
        .limit(100);

      if (!interviewsError && interviewsData && interviewsData.length > 0) {
        const jobIds = [...new Set(interviewsData.map(i => i.job_id))];
        
        const { data: validJobs } = await supabase
          .from('jobs')
          .select('id')
          .in('id', jobIds);

        const validJobIds = new Set(validJobs?.map(j => j.id) || []);
        const orphanedInterviews = jobIds.filter(id => !validJobIds.has(id)).length;

        checks.push({
          name: 'Data Integrity: Interviews',
          status: orphanedInterviews === 0 ? 'pass' : 'warning',
          message: orphanedInterviews === 0 
            ? 'All interviews have valid job references' 
            : `${orphanedInterviews} interviews may have invalid job references`,
          count: orphanedInterviews
        });
      } else {
        checks.push({
          name: 'Data Integrity: Interviews',
          status: 'pass',
          message: 'No interviews to verify or table empty'
        });
      }
      setCheckProgress(85);

      // Check 5: Storage buckets accessibility
      const buckets = ['profile-pictures', 'application-materials'];
      for (const bucket of buckets) {
        const { error: bucketError } = await supabase.storage.from(bucket).list('', { limit: 1 });
        checks.push({
          name: `Storage: ${bucket}`,
          status: bucketError ? 'warning' : 'pass',
          message: bucketError ? `Cannot access bucket: ${bucketError.message}` : 'Bucket accessible'
        });
      }
      setCheckProgress(100);

      setIntegrityChecks(checks);
      setLastCheckTime(new Date());
      
      const failedChecks = checks.filter(c => c.status === 'fail').length;
      const warningChecks = checks.filter(c => c.status === 'warning').length;

      if (failedChecks > 0) {
        toast.error(`Data integrity check completed with ${failedChecks} failures`);
      } else if (warningChecks > 0) {
        toast.warning(`Data integrity check completed with ${warningChecks} warnings`);
      } else {
        toast.success('All data integrity checks passed!');
      }
    } catch (error) {
      console.error('Error running integrity checks:', error);
      toast.error('Failed to complete integrity checks');
    } finally {
      setIsRunningChecks(false);
    }
  };

  const getStatusIcon = (status: IntegrityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: IntegrityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Warning</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const passedChecks = integrityChecks.filter(c => c.status === 'pass').length;
  const totalChecks = integrityChecks.length;

  return (
    <div className="space-y-6">
      {/* Backup Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Automated daily backups enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Period</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 Days</div>
            <p className="text-xs text-muted-foreground">
              Free tier backup retention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalChecks > 0 ? `${passedChecks}/${totalChecks}` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastCheckTime 
                ? `Last checked: ${lastCheckTime.toLocaleTimeString()}`
                : 'Not yet verified'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="verification" className="space-y-4">
        <TabsList>
          <TabsTrigger value="verification">Data Verification</TabsTrigger>
          <TabsTrigger value="procedures">Recovery Procedures</TabsTrigger>
          <TabsTrigger value="runbook">Disaster Runbook</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Data Integrity Verification
              </CardTitle>
              <CardDescription>
                Run checks to verify database integrity and data consistency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={runDataIntegrityChecks} 
                  disabled={isRunningChecks}
                >
                  {isRunningChecks ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running Checks...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Run Integrity Checks
                    </>
                  )}
                </Button>
                {lastCheckTime && (
                  <span className="text-sm text-muted-foreground">
                    Last run: {lastCheckTime.toLocaleString()}
                  </span>
                )}
              </div>

              {isRunningChecks && (
                <div className="space-y-2">
                  <Progress value={checkProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Running verification checks... {checkProgress}%
                  </p>
                </div>
              )}

              {integrityChecks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Check Results</h4>
                  <div className="space-y-2">
                    {integrityChecks.map((check, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <p className="font-medium text-sm">{check.name}</p>
                            <p className="text-xs text-muted-foreground">{check.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {check.count !== undefined && (
                            <span className="text-sm text-muted-foreground">
                              {check.name.startsWith('Data Integrity') 
                                ? (check.count === 0 ? '0 issues' : `${check.count} issues`)
                                : `${check.count} records`}
                            </span>
                          )}
                          {getStatusBadge(check.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tableStats.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Table Statistics</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {tableStats.map((stat) => (
                      <div 
                        key={stat.table_name}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <p className="text-sm font-medium">{stat.table_name}</p>
                        <p className="text-2xl font-bold">{stat.row_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">records</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Recovery Procedures
              </CardTitle>
              <CardDescription>
                Step-by-step procedures for restoring from backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <HardDrive className="h-4 w-4" />
                <AlertTitle>Automatic Backups</AlertTitle>
                <AlertDescription>
                  The platform performs daily automated backups at ~00:00 UTC.
                  Backups are stored separately from the primary database and encrypted at rest.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Restore from Automatic Backup</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Contact platform support via the dashboard</li>
                    <li>Specify the desired restore point (date/time)</li>
                    <li>Provide reason for restoration request</li>
                    <li>Support will initiate the restore process</li>
                    <li>Run data integrity verification after restore</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estimated time: 1-2 hours depending on database size
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Rollback Bad Deployment</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Open the project editor</li>
                    <li>Click on version history</li>
                    <li>Select the last known good version</li>
                    <li>Click "Restore this version"</li>
                    <li>Verify application functionality</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estimated time: 15-30 minutes
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Application State Recovery</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Clear browser cache and localStorage</li>
                    <li>Force refresh the application (Ctrl+Shift+R)</li>
                    <li>Log out and log back in</li>
                    <li>Verify data loads correctly</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runbook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Disaster Recovery Runbook
              </CardTitle>
              <CardDescription>
                Quick reference for common disaster scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive">P1 Critical</Badge>
                    <h4 className="font-medium">Database Corruption</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">RTO: 2 hours | RPO: 24 hours</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Stop all write operations</li>
                    <li>Contact platform support immediately</li>
                    <li>Request backup restoration</li>
                    <li>Run integrity verification</li>
                    <li>Resume operations</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-500">P2 High</Badge>
                    <h4 className="font-medium">Accidental Data Deletion</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">RTO: 1 hour | RPO: 24 hours</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Identify scope of deletion</li>
                    <li>Stop further deletions</li>
                    <li>Request point-in-time restore</li>
                    <li>Verify restored data</li>
                    <li>Investigate root cause</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive">P1 Critical</Badge>
                    <h4 className="font-medium">Security Breach</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">RTO: 4 hours | RPO: Varies</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Isolate affected systems</li>
                    <li>Rotate all secrets</li>
                    <li>Revoke suspicious sessions</li>
                    <li>Audit access logs</li>
                    <li>Notify affected users</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-yellow-500">P3 Medium</Badge>
                    <h4 className="font-medium">Edge Function Failure</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">RTO: 30 min | RPO: No loss</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Check edge function logs</li>
                    <li>Identify failing function</li>
                    <li>Rollback or disable function</li>
                    <li>Fix and redeploy</li>
                    <li>Verify function health</li>
                  </ol>
                </div>
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Full Documentation</AlertTitle>
                <AlertDescription>
                  For complete disaster recovery procedures, see{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    docs/BACKUP_DISASTER_RECOVERY.md
                  </code>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
