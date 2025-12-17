import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { FileText, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  report_data: any;
  generated_at: string;
}

export function ApiWeeklyReport() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await supabase
        .from('api_weekly_reports')
        .select('*')
        .order('week_end', { ascending: false })
        .limit(10);

      setReports(data || []);
      if (data && data.length > 0) {
        setSelectedReport(data[0]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-api-weekly-report');
      
      if (error) throw error;
      
      toast({ title: 'Report generated successfully' });
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ 
        title: 'Failed to generate report', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const report = selectedReport?.report_data;

  return (
    <div className="space-y-6">
      {/* Report Selection & Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Weekly API Usage Reports
              </CardTitle>
              <CardDescription>Historical usage reports and trend analysis</CardDescription>
            </div>
            <Button onClick={generateReport} disabled={generating}>
              {generating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate New Report
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reports generated yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Generate New Report" to create your first weekly report</p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {reports.map(r => (
                <Button
                  key={r.id}
                  variant={selectedReport?.id === r.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedReport(r)}
                >
                  {format(new Date(r.week_start), 'MMM d')} - {format(new Date(r.week_end), 'MMM d')}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Details */}
      {report && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary?.total_requests?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{report.summary?.overall_success_rate || 100}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{report.summary?.total_errors || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Alerts Triggered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.alerts_summary?.total_alerts || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Service Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Service Breakdown</CardTitle>
              <CardDescription>Usage statistics for each API service</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {report.service_reports?.map((service: any) => (
                    <div key={service.service_name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{service.display_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {service.total_requests.toLocaleString()} requests this week
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(service.request_trend_percent)}
                          <span className={`text-sm ${
                            service.request_trend_percent > 0 ? 'text-green-600' : 
                            service.request_trend_percent < 0 ? 'text-destructive' : ''
                          }`}>
                            {service.request_trend_percent > 0 ? '+' : ''}{service.request_trend_percent}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className={`font-medium ${service.success_rate < 90 ? 'text-destructive' : 'text-green-600'}`}>
                            {service.success_rate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Response</p>
                          <p className={`font-medium ${service.avg_response_time_ms > 2000 ? 'text-yellow-600' : ''}`}>
                            {service.avg_response_time_ms}ms
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Errors</p>
                          <p className={`font-medium ${service.failed_requests > 0 ? 'text-destructive' : ''}`}>
                            {service.failed_requests}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fallbacks</p>
                          <p className="font-medium">{service.fallback_count}</p>
                        </div>
                      </div>

                      {service.quota_usage_percent !== null && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Quota Usage (avg daily)</span>
                            <span>{service.quota_usage_percent}%</span>
                          </div>
                          <Progress 
                            value={service.quota_usage_percent} 
                            className={`h-2 ${
                              service.quota_usage_percent >= 90 ? '[&>div]:bg-destructive' : 
                              service.quota_usage_percent >= 70 ? '[&>div]:bg-yellow-500' : ''
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
