import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ApiAlert {
  id: string;
  service_name: string;
  alert_type: string;
  severity: string;
  message: string;
  current_value: number;
  threshold_value: number;
  resolved_at: string | null;
  created_at: string;
}

export function ApiAlerts() {
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [showResolved]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('api_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!showResolved) {
        query = query.is('resolved_at', null);
      }

      const { data } = await query;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from('api_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    fetchAlerts();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case 'quota_warning': return <Badge variant="outline">Quota</Badge>;
      case 'error_rate': return <Badge variant="outline">Error Rate</Badge>;
      case 'response_time': return <Badge variant="outline">Response Time</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={criticalCount > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            {criticalCount > 0 && (
              <p className="text-xs text-destructive">{criticalCount} critical</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quota Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeAlerts.filter(a => a.alert_type === 'quota_warning').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeAlerts.filter(a => a.alert_type === 'error_rate').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                API Alerts
              </CardTitle>
              <CardDescription>Alerts when approaching API rate limits or experiencing errors</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={showResolved ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? 'Hide Resolved' : 'Show Resolved'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAlerts}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">All API services are operating normally</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-lg p-4 ${
                      alert.resolved_at ? 'opacity-60 bg-muted/30' : 
                      alert.severity === 'critical' ? 'border-destructive bg-destructive/5' :
                      alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityBadge(alert.severity)}
                            {getAlertTypeBadge(alert.alert_type)}
                            <Badge variant="outline">{alert.service_name}</Badge>
                            {alert.resolved_at && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Current: {Math.round(alert.current_value)}%</span>
                            <span>Threshold: {alert.threshold_value}%</span>
                            <span>{format(new Date(alert.created_at), 'MMM d, HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                      {!alert.resolved_at && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
