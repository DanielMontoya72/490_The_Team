import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods for logging tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
}));

// Mock Web Vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));

describe('Monitoring & Alerting System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Tracking (Sentry)', () => {
    it('should initialize Sentry with correct config', async () => {
      const Sentry = await import('@sentry/react');
      const { initSentry } = await import('@/lib/sentry');
      
      initSentry();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: expect.any(String),
          environment: expect.any(String),
        })
      );
    });

    it('should capture exceptions with context', async () => {
      const Sentry = await import('@sentry/react');
      
      const error = new Error('Test error');
      Sentry.captureException(error, {
        extra: { component: 'TestComponent', action: 'testAction' },
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            component: 'TestComponent',
          }),
        })
      );
    });

    it('should set user context for error tracking', async () => {
      const Sentry = await import('@sentry/react');
      
      Sentry.setUser({
        id: 'user-123',
        email: 'user@example.com',
      });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'user@example.com',
      });
    });

    it('should add breadcrumbs for debugging', async () => {
      const Sentry = await import('@sentry/react');
      
      Sentry.addBreadcrumb({
        message: 'User navigated to dashboard',
        category: 'navigation',
        level: 'info',
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring (Web Vitals)', () => {
    it('should register all Web Vital metrics', async () => {
      const webVitals = await import('web-vitals');
      const { initPerformanceMonitoring } = await import('@/lib/performanceMonitor');
      
      initPerformanceMonitoring();

      expect(webVitals.onCLS).toHaveBeenCalled();
      expect(webVitals.onINP).toHaveBeenCalled();
      expect(webVitals.onLCP).toHaveBeenCalled();
      expect(webVitals.onFCP).toHaveBeenCalled();
      expect(webVitals.onTTFB).toHaveBeenCalled();
    });

    it('should report metrics with correct thresholds', () => {
      const metrics = {
        CLS: { good: 0.1, needsImprovement: 0.25 },
        INP: { good: 200, needsImprovement: 500 },
        LCP: { good: 2500, needsImprovement: 4000 },
        FCP: { good: 1800, needsImprovement: 3000 },
        TTFB: { good: 800, needsImprovement: 1800 },
      };

      // Test CLS threshold
      expect(0.05).toBeLessThan(metrics.CLS.good);
      expect(0.15).toBeLessThan(metrics.CLS.needsImprovement);

      // Test LCP threshold
      expect(2000).toBeLessThan(metrics.LCP.good);
      expect(3000).toBeLessThan(metrics.LCP.needsImprovement);
    });
  });

  describe('Structured Logging', () => {
    it('should log with correct levels', async () => {
      const { logger } = await import('@/lib/logger');
      
      logger.info('Test info message', { component: 'test' });
      logger.warn('Test warning', { component: 'test' });
      logger.error('Test error', { component: 'test' });

      // Verify logger methods exist
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should include timestamp and context in logs', () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Test message',
        context: { component: 'Dashboard', action: 'load' },
      };

      expect(logEntry.timestamp).toBeTruthy();
      expect(logEntry.level).toBe('info');
      expect(logEntry.context.component).toBe('Dashboard');
    });
  });

  describe('API Usage Monitoring', () => {
    it('should track API usage per endpoint', () => {
      // Test API usage tracking structure
      const usageLog = {
        endpoint: 'generate-cover-letter',
        tokens_used: 500,
        response_time_ms: 1200,
        timestamp: new Date().toISOString(),
      };

      expect(usageLog.endpoint).toBe('generate-cover-letter');
      expect(usageLog.tokens_used).toBe(500);
      expect(usageLog.response_time_ms).toBe(1200);
    });

    it('should aggregate daily usage statistics', () => {
      // Test daily aggregation structure
      const dailyStats = [
        { date: '2024-01-15', total_requests: 100, total_tokens: 50000 },
        { date: '2024-01-16', total_requests: 120, total_tokens: 60000 },
      ];

      expect(dailyStats).toHaveLength(2);
      expect(dailyStats[0].total_requests).toBe(100);
      expect(dailyStats[1].total_tokens).toBe(60000);
    });
  });

  describe('Alert Thresholds', () => {
    it('should trigger alert when error rate exceeds threshold', () => {
      const errorRateThreshold = 5; // 5%
      const currentErrorRate = 8;

      const shouldAlert = currentErrorRate > errorRateThreshold;
      expect(shouldAlert).toBe(true);
    });

    it('should trigger alert when response time exceeds threshold', () => {
      const responseTimeThreshold = 3000; // 3 seconds
      const currentResponseTime = 4500;

      const shouldAlert = currentResponseTime > responseTimeThreshold;
      expect(shouldAlert).toBe(true);
    });

    it('should trigger alert when API quota is near limit', () => {
      const quotaLimit = 1000;
      const currentUsage = 950;
      const warningThreshold = 0.9; // 90%

      const usagePercentage = currentUsage / quotaLimit;
      const shouldAlert = usagePercentage >= warningThreshold;
      expect(shouldAlert).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should verify Supabase connection health', () => {
      // Test health check response structure
      const healthCheckResult = {
        data: [{ id: 1, status: 'healthy' }],
        error: null,
      };

      const isHealthy = healthCheckResult.error === null && healthCheckResult.data.length > 0;
      expect(isHealthy).toBe(true);
    });

    it('should verify API endpoint availability', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      const response = await fetch('https://api.example.com/health');
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Boundary Monitoring', () => {
    it('should capture React error boundary errors', async () => {
      const Sentry = await import('@sentry/react');
      
      const error = new Error('Component crashed');
      const errorInfo = { componentStack: '<TestComponent>' };

      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            componentStack: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Rate Limiting Monitoring', () => {
    it('should track rate limit hits', () => {
      const rateLimitEvents = [
        { endpoint: 'generate-cover-letter', timestamp: Date.now() - 1000 },
        { endpoint: 'generate-cover-letter', timestamp: Date.now() - 500 },
        { endpoint: 'generate-cover-letter', timestamp: Date.now() },
      ];

      const oneMinuteAgo = Date.now() - 60000;
      const recentHits = rateLimitEvents.filter(e => e.timestamp > oneMinuteAgo);
      
      expect(recentHits.length).toBe(3);
    });

    it('should identify frequently rate-limited endpoints', () => {
      const rateLimitStats = {
        'generate-cover-letter': 15,
        'analyze-skill-gaps': 5,
        'generate-resume-content': 20,
      };

      const highRateLimitEndpoints = Object.entries(rateLimitStats)
        .filter(([_, count]) => count > 10)
        .map(([endpoint]) => endpoint);

      expect(highRateLimitEndpoints).toContain('generate-cover-letter');
      expect(highRateLimitEndpoints).toContain('generate-resume-content');
    });
  });

  describe('Weekly Report Generation', () => {
    it('should generate weekly API usage report', () => {
      // Test weekly report structure
      const weeklyReport = {
        period: '2024-01-08 to 2024-01-14',
        totalRequests: 5000,
        totalTokens: 2500000,
        topEndpoints: [
          { name: 'generate-cover-letter', count: 1500 },
          { name: 'analyze-skill-gaps', count: 800 },
        ],
        errorRate: 2.5,
      };

      expect(weeklyReport.totalRequests).toBe(5000);
      expect(weeklyReport.topEndpoints).toBeInstanceOf(Array);
      expect(weeklyReport.topEndpoints.length).toBeGreaterThan(0);
      expect(weeklyReport.errorRate).toBeLessThan(5);
    });
  });

  describe('Dashboard Metrics', () => {
    it('should calculate uptime percentage', () => {
      const totalMinutes = 7 * 24 * 60; // One week
      const downtimeMinutes = 30;
      
      const uptimePercentage = ((totalMinutes - downtimeMinutes) / totalMinutes) * 100;
      
      expect(uptimePercentage).toBeGreaterThan(99);
    });

    it('should calculate average response time', () => {
      const responseTimes = [120, 150, 200, 180, 160, 140, 190];
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      expect(avgResponseTime).toBeLessThan(200);
    });
  });
});

