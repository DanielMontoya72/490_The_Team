/**
 * API monitoring utility for tracking response times and error rates
 */
import logger from './logger';
import { captureError } from './sentry';

export interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

class ApiMonitor {
  private static instance: ApiMonitor;
  private metrics: ApiMetric[] = [];
  private maxMetrics = 500;

  private constructor() {}

  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor();
    }
    return ApiMonitor.instance;
  }

  recordMetric(metric: Omit<ApiMetric, 'timestamp'>): void {
    const fullMetric: ApiMetric = {
      ...metric,
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
}

export const apiMonitor = ApiMonitor.getInstance();

/**
 * Wrapper for fetch that automatically tracks metrics
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit
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
    });

    if (error instanceof Error) {
      captureError(error, { endpoint, method });
    }

    throw error;
  }
}

export default apiMonitor;
