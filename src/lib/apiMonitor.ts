/**
 * API monitoring utility for tracking response times and error rates
 * Persists metrics to database for dashboard display
 */
import logger from './logger';
import { captureError } from './sentry';
import { supabase } from '@/integrations/supabase/client';

export interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  serviceName?: string;
}

// Map endpoints to service names for tracking
const getServiceNameFromEndpoint = (endpoint: string): string => {
  if (endpoint.includes('api.github.com')) return 'github_api';
  if (endpoint.includes('gmail.googleapis.com')) return 'gmail_api';
  if (endpoint.includes('api.linkedin.com')) return 'linkedin_api';
  if (endpoint.includes('api.mapbox.com')) return 'mapbox';
  if (endpoint.includes('nominatim.openstreetmap.org')) return 'nominatim';
  if (endpoint.includes('router.project-osrm.org')) return 'osrm';
  if (endpoint.includes('api.bls.gov')) return 'bls_api';
  if (endpoint.includes('timeapi.io')) return 'timeapi';
  return 'unknown';
};

class ApiMonitor {
  private static instance: ApiMonitor;
  private metrics: ApiMetric[] = [];
  private maxMetrics = 500;
  private pendingDbWrites: ApiMetric[] = [];
  private writeTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor();
    }
    return ApiMonitor.instance;
  }

  recordMetric(metric: Omit<ApiMetric, 'timestamp'>): void {
    const serviceName = metric.serviceName || getServiceNameFromEndpoint(metric.endpoint);
    const fullMetric: ApiMetric = {
      ...metric,
      serviceName,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(fullMetric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log based on status
    const logContext = {
      component: 'api',
      action: 'request',
      endpoint: metric.endpoint,
      method: metric.method,
      statusCode: metric.statusCode,
      duration: metric.duration,
      serviceName,
    };

    if (metric.success) {
      logger.info(`API ${metric.method} ${metric.endpoint} completed`, logContext);
    } else {
      logger.error(`API ${metric.method} ${metric.endpoint} failed`, {
        ...logContext,
        errorMessage: metric.errorMessage,
      });
    }

    // Alert on slow responses (> 5 seconds)
    if (metric.duration > 5000) {
      logger.warn(`Slow API response detected`, {
        ...logContext,
        alertType: 'slow_response',
      });
    }

    // Queue for database persistence (batched writes)
    this.queueDbWrite(fullMetric);
  }

  private queueDbWrite(metric: ApiMetric): void {
    this.pendingDbWrites.push(metric);
    
    // Batch writes - wait 2 seconds before writing to reduce DB calls
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
    
    this.writeTimeout = setTimeout(() => {
      this.flushDbWrites();
    }, 2000);
  }

  private async flushDbWrites(): Promise<void> {
    if (this.pendingDbWrites.length === 0) return;

    const metricsToWrite = [...this.pendingDbWrites];
    this.pendingDbWrites = [];

    try {
      // Write to api_usage_logs
      const logsToInsert = metricsToWrite.map(m => ({
        service_name: m.serviceName || 'unknown',
        endpoint: m.endpoint.substring(0, 500), // Truncate long URLs
        method: m.method,
        status_code: m.statusCode,
        response_time_ms: m.duration,
        success: m.success,
        error_message: m.errorMessage?.substring(0, 500),
        created_at: m.timestamp,
      }));

      const { error: logsError } = await supabase
        .from('api_usage_logs')
        .insert(logsToInsert);

      if (logsError) {
        console.error('Failed to write API logs:', logsError);
        return;
      }

      // Update daily aggregates
      await this.updateDailyAggregates(metricsToWrite);
    } catch (error) {
      console.error('Error persisting API metrics:', error);
    }
  }

  private async updateDailyAggregates(metrics: ApiMetric[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Group by service
    const byService: Record<string, { 
      total: number; 
      success: number; 
      failed: number; 
      totalTime: number;
      times: number[];
    }> = {};

    metrics.forEach(m => {
      const service = m.serviceName || 'unknown';
      if (!byService[service]) {
        byService[service] = { total: 0, success: 0, failed: 0, totalTime: 0, times: [] };
      }
      byService[service].total++;
      byService[service].totalTime += m.duration;
      byService[service].times.push(m.duration);
      if (m.success) {
        byService[service].success++;
      } else {
        byService[service].failed++;
      }
    });

    // Update each service's daily record
    for (const [serviceName, stats] of Object.entries(byService)) {
      // Get current daily record
      const { data: existing } = await supabase
        .from('api_usage_daily')
        .select('*')
        .eq('service_name', serviceName)
        .eq('date', today)
        .single();

      const avgResponseTime = Math.round(stats.totalTime / stats.total);
      
      // Calculate p95 from new times
      const sortedTimes = [...stats.times].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95 = sortedTimes[p95Index] || avgResponseTime;

      if (existing) {
        // Update existing record
        const newTotal = (existing.total_requests || 0) + stats.total;
        const newSuccess = (existing.successful_requests || 0) + stats.success;
        const newFailed = (existing.failed_requests || 0) + stats.failed;
        const newTotalTime = (existing.total_response_time_ms || 0) + stats.totalTime;
        
        await supabase
          .from('api_usage_daily')
          .update({
            total_requests: newTotal,
            successful_requests: newSuccess,
            failed_requests: newFailed,
            total_response_time_ms: newTotalTime,
            avg_response_time_ms: Math.round(newTotalTime / newTotal),
            p95_response_time_ms: Math.max(existing.p95_response_time_ms || 0, p95),
          })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await supabase
          .from('api_usage_daily')
          .insert({
            service_name: serviceName,
            date: today,
            total_requests: stats.total,
            successful_requests: stats.success,
            failed_requests: stats.failed,
            total_response_time_ms: stats.totalTime,
            avg_response_time_ms: avgResponseTime,
            p95_response_time_ms: p95,
          });
      }
    }
  }

  getMetrics(): ApiMetric[] {
    return [...this.metrics];
  }

  getMetricsByEndpoint(endpoint: string): ApiMetric[] {
    return this.metrics.filter(m => m.endpoint.includes(endpoint));
  }

  getStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequestRate: number;
    byEndpoint: Record<string, { count: number; avgTime: number; errorRate: number }>;
  } {
    const total = this.metrics.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequestRate: 0,
        byEndpoint: {},
      };
    }

    const successful = this.metrics.filter(m => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const slowRequests = this.metrics.filter(m => m.duration > 5000).length;

    // Group by endpoint
    const byEndpoint: Record<string, { count: number; totalTime: number; errors: number }> = {};
    this.metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!byEndpoint[key]) {
        byEndpoint[key] = { count: 0, totalTime: 0, errors: 0 };
      }
      byEndpoint[key].count++;
      byEndpoint[key].totalTime += m.duration;
      if (!m.success) byEndpoint[key].errors++;
    });

    const endpointStats: Record<string, { count: number; avgTime: number; errorRate: number }> = {};
    Object.entries(byEndpoint).forEach(([key, data]) => {
      endpointStats[key] = {
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count),
        errorRate: Math.round((data.errors / data.count) * 100),
      };
    });

    return {
      totalRequests: total,
      successRate: Math.round((successful / total) * 100),
      averageResponseTime: Math.round(totalDuration / total),
      errorRate: Math.round(((total - successful) / total) * 100),
      slowRequestRate: Math.round((slowRequests / total) * 100),
      byEndpoint: endpointStats,
    };
  }

  getRecentErrors(): ApiMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-20)
      .reverse();
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  // Force flush pending writes (useful before page unload)
  async forceFlush(): Promise<void> {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
    }
    await this.flushDbWrites();
  }
}

export const apiMonitor = ApiMonitor.getInstance();

/**
 * Wrapper for fetch that automatically tracks metrics
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  serviceName?: string
): Promise<Response> {
  const startTime = performance.now();
  const method = init?.method || 'GET';
  const endpoint = typeof input === 'string' ? input : input.toString();

  try {
    const response = await fetch(input, init);
    const duration = Math.round(performance.now() - startTime);

    apiMonitor.recordMetric({
      endpoint,
      method,
      statusCode: response.status,
      duration,
      success: response.ok,
      errorMessage: response.ok ? undefined : response.statusText,
      serviceName,
    });

    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    apiMonitor.recordMetric({
      endpoint,
      method,
      statusCode: 0,
      duration,
      success: false,
      errorMessage,
      serviceName,
    });

    if (error instanceof Error) {
      captureError(error, { endpoint, method });
    }

    throw error;
  }
}

export default apiMonitor;
