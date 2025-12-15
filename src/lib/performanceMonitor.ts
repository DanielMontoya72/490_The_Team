import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import { logger } from './logger';

interface PerformanceMetrics {
  cls?: number;
  inp?: number;
  lcp?: number;
  fcp?: number;
  ttfb?: number;
}

const metrics: PerformanceMetrics = {};

const reportMetric = (metric: Metric) => {
  const { name, value, rating } = metric;
  
  // Store metric
  switch (name) {
    case 'CLS':
      metrics.cls = value;
      break;
    case 'INP':
      metrics.inp = value;
      break;
    case 'LCP':
      metrics.lcp = value;
      break;
    case 'FCP':
      metrics.fcp = value;
      break;
    case 'TTFB':
      metrics.ttfb = value;
      break;
  }

  // Log with appropriate level based on rating
  const logLevel = rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warn' : 'error';
  
  logger[logLevel](`Web Vital: ${name}`, {
    value: Math.round(value * 100) / 100,
    rating,
    threshold: getThreshold(name),
    unit: name === 'CLS' ? '' : 'ms'
  });
};

const getThreshold = (name: string): string => {
  switch (name) {
    case 'CLS':
      return '< 0.1 (good), < 0.25 (needs improvement)';
    case 'INP':
      return '< 200ms (good), < 500ms (needs improvement)';
    case 'LCP':
      return '< 2500ms (good), < 4000ms (needs improvement)';
    case 'FCP':
      return '< 1800ms (good), < 3000ms (needs improvement)';
    case 'TTFB':
      return '< 800ms (good), < 1800ms (needs improvement)';
    default:
      return '';
  }
};

export const initPerformanceMonitoring = () => {
  // Only run in browser
  if (typeof window === 'undefined') return;

  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);

  logger.info('Performance monitoring initialized');
};

export const getPerformanceMetrics = (): PerformanceMetrics => metrics;

// Performance budget checker
export const checkPerformanceBudget = (): { passed: boolean; violations: string[] } => {
  const violations: string[] = [];
  
  if (metrics.lcp && metrics.lcp > 2500) {
    violations.push(`LCP ${Math.round(metrics.lcp)}ms exceeds 2500ms budget`);
  }
  if (metrics.inp && metrics.inp > 200) {
    violations.push(`INP ${Math.round(metrics.inp)}ms exceeds 200ms budget`);
  }
  if (metrics.cls && metrics.cls > 0.1) {
    violations.push(`CLS ${metrics.cls.toFixed(3)} exceeds 0.1 budget`);
  }
  if (metrics.fcp && metrics.fcp > 1800) {
    violations.push(`FCP ${Math.round(metrics.fcp)}ms exceeds 1800ms budget`);
  }
  if (metrics.ttfb && metrics.ttfb > 600) {
    violations.push(`TTFB ${Math.round(metrics.ttfb)}ms exceeds 600ms budget`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
};

// Resource timing analysis
export const getResourceTimings = () => {
  if (typeof window === 'undefined' || !window.performance) return [];
  
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return resources.map(r => ({
    name: r.name.split('/').pop() || r.name,
    type: r.initiatorType,
    duration: Math.round(r.duration),
    size: r.transferSize,
    cached: r.transferSize === 0 && r.decodedBodySize > 0
  })).sort((a, b) => b.duration - a.duration).slice(0, 10);
};

// Navigation timing
export const getNavigationTiming = () => {
  if (typeof window === 'undefined' || !window.performance) return null;
  
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!nav) return null;
  
  return {
    dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
    tcp: Math.round(nav.connectEnd - nav.connectStart),
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    download: Math.round(nav.responseEnd - nav.responseStart),
    domParsing: Math.round(nav.domInteractive - nav.responseEnd),
    domComplete: Math.round(nav.domComplete - nav.domInteractive),
    total: Math.round(nav.loadEventEnd - nav.startTime)
  };
};
