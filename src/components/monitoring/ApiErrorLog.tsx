import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Search, RefreshCw, Clock, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ApiError {
  id: string;
  service_name: string;
  endpoint: string;
  method: string;
  status_code: number;
  error_message: string;
  response_time_ms: number;
  created_at: string;
  fallback_used: boolean;
}

export function ApiErrorLog() {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    fetchErrors();
    fetchServices();
  }, []);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(100);

      setErrors(data || []);
    } catch (error) {
      console.error('Error fetching API errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('api_service_registry')
      .select('service_name');
    setServices(data?.map(s => s.service_name) || []);
  };

  const filteredErrors = errors.filter(error => {
    const matchesSearch = !searchQuery || 
      error.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesService = serviceFilter === 'all' || error.service_name === serviceFilter;
    
    return matchesSearch && matchesService;
  });

  const getStatusBadge = (statusCode: number) => {
    if (statusCode === 0) return <Badge variant="destructive">Network Error</Badge>;
    if (statusCode >= 500) return <Badge variant="destructive">Server Error ({statusCode})</Badge>;
    if (statusCode >= 400) return <Badge className="bg-yellow-500">Client Error ({statusCode})</Badge>;
    return <Badge variant="outline">{statusCode}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              API Error Log
            </CardTitle>
            <CardDescription>Recent API errors with timestamps and details</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchErrors}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map(service => (
                <SelectItem key={service} value={service}>{service}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading error log...</div>
        ) : filteredErrors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {errors.length === 0 ? 'No API errors recorded' : 'No errors match your filters'}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredErrors.map(error => (
                <div 
                  key={error.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{error.service_name}</Badge>
                      {getStatusBadge(error.status_code)}
                      {error.fallback_used && (
                        <Badge variant="secondary">Fallback Used</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(error.created_at), 'MMM d, HH:mm:ss')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {error.method}
                      </Badge>
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-md">
                        {error.endpoint}
                      </code>
                    </div>

                    {error.error_message && (
                      <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                        {error.error_message}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Response time: {error.response_time_ms}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Error Statistics */}
        {errors.length > 0 && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Errors</p>
              <p className="font-bold text-destructive">{errors.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Most Affected</p>
              <p className="font-bold">
                {(() => {
                  const counts: Record<string, number> = {};
                  errors.forEach(e => counts[e.service_name] = (counts[e.service_name] || 0) + 1);
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                  return sorted[0]?.[0] || '-';
                })()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fallbacks Used</p>
              <p className="font-bold">{errors.filter(e => e.fallback_used).length}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
