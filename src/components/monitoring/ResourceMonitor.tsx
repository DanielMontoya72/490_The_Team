import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, HardDrive, Cpu, Activity, Play, Square, AlertTriangle, CheckCircle } from 'lucide-react';
import { cache } from '@/lib/cache';
import { useToast } from '@/hooks/use-toast';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ResourceStats {
  memory: MemoryInfo | null;
  cacheStats: { memory: number; localStorage: number };
  localStorageUsed: number;
  localStorageLimit: number;
}

interface StressTestResult {
  operationsCompleted: number;
  duration: number;
  operationsPerSecond: number;
  memoryBefore: number | null;
  memoryAfter: number | null;
  responsive: boolean;
  errors: number;
}

export function ResourceMonitor() {
  const [stats, setStats] = useState<ResourceStats>({
    memory: null,
    cacheStats: { memory: 0, localStorage: 0 },
    localStorageUsed: 0,
    localStorageLimit: 5 * 1024 * 1024,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<StressTestResult | null>(null);
  const [stressProgress, setStressProgress] = useState(0);
  const { toast } = useToast();

  const collectStats = useCallback(() => {
    setIsRefreshing(true);

    const memory = (performance as Performance & { memory?: MemoryInfo }).memory || null;
    const cacheStats = cache.getStats();

    let localStorageUsed = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageUsed += (localStorage.getItem(key)?.length || 0) * 2;
        }
      }
    } catch (e) {
      console.warn('Error calculating localStorage size:', e);
    }

    setStats({
      memory,
      cacheStats,
      localStorageUsed,
      localStorageLimit: 5 * 1024 * 1024,
    });

    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  useEffect(() => {
    collectStats();
    const interval = setInterval(collectStats, 30000);
    return () => clearInterval(interval);
  }, [collectStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const runStressTest = async () => {
    setIsRunningStressTest(true);
    setStressTestResult(null);
    setStressProgress(0);

    const memoryBefore = (performance as Performance & { memory?: MemoryInfo }).memory?.usedJSHeapSize || null;
    const startTime = performance.now();
    const targetOperations = 1000;
    let completedOps = 0;
    let errors = 0;
    let lastFrameTime = performance.now();
    let responsive = true;

    toast({ title: 'Stress Test Started', description: 'Simulating high load...' });

    // Simulate high load with various operations
    for (let batch = 0; batch < 10; batch++) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          for (let i = 0; i < 100; i++) {
            try {
              // CPU-intensive: JSON serialization
              const testData = { id: i, data: Array(100).fill('test'), nested: { a: 1, b: 2 } };
              JSON.stringify(testData);
              JSON.parse(JSON.stringify(testData));

              // Memory-intensive: create objects
              const arr = new Array(1000).fill(0).map((_, idx) => ({ index: idx, value: Math.random() }));
              arr.sort((a, b) => a.value - b.value);

              // Cache operations
              cache.set(`stress-test-${batch}-${i}`, { timestamp: Date.now(), data: testData }, { ttlSeconds: 60 });

              completedOps++;
            } catch (e) {
              errors++;
            }
          }

          // Check responsiveness (frame time should be < 100ms for interactive UI)
          const currentTime = performance.now();
          if (currentTime - lastFrameTime > 100) {
            responsive = false;
          }
          lastFrameTime = currentTime;

          setStressProgress((batch + 1) * 10);
          resolve();
        }, 50); // Small delay between batches to allow UI updates
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const memoryAfter = (performance as Performance & { memory?: MemoryInfo }).memory?.usedJSHeapSize || null;

    // Cleanup stress test cache entries
    await cache.invalidate('stress-test-*');

    const result: StressTestResult = {
      operationsCompleted: completedOps,
      duration: Math.round(duration),
      operationsPerSecond: Math.round((completedOps / duration) * 1000),
      memoryBefore,
      memoryAfter,
      responsive,
      errors,
    };

    setStressTestResult(result);
    setIsRunningStressTest(false);
    collectStats();

    toast({
      title: result.responsive ? '✅ Stress Test Passed' : '⚠️ Stress Test Warning',
      description: `${completedOps} operations in ${Math.round(duration)}ms`,
    });
  };

  const memoryPercentage = stats.memory 
    ? (stats.memory.usedJSHeapSize / stats.memory.jsHeapSizeLimit) * 100 
    : 0;

  const storagePercentage = (stats.localStorageUsed / stats.localStorageLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resource Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Track application resource usage and simulate high load scenarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={collectStats}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stress Test Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            High Load Simulation
          </CardTitle>
          <CardDescription>
            Simulate high load to verify application remains responsive under stress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runStressTest}
              disabled={isRunningStressTest}
              variant={isRunningStressTest ? "secondary" : "default"}
            >
              {isRunningStressTest ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Stress Test
                </>
              )}
            </Button>
            {isRunningStressTest && (
              <div className="flex-1">
                <Progress value={stressProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{stressProgress}% complete</p>
              </div>
            )}
          </div>

          {stressTestResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{stressTestResult.operationsCompleted}</div>
                <p className="text-xs text-muted-foreground">Operations</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stressTestResult.duration}ms</div>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stressTestResult.operationsPerSecond}</div>
                <p className="text-xs text-muted-foreground">Ops/second</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {stressTestResult.responsive ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-semibold">Responsive</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-600 font-semibold">Degraded</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">UI Status</p>
              </div>
            </div>
          )}

          {stressTestResult && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Test Details:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• CPU: JSON serialization/parsing (1000 objects)</li>
                <li>• Memory: Array sorting (1M elements total)</li>
                <li>• I/O: Cache read/write operations (1000 entries)</li>
                <li>• Errors during test: {stressTestResult.errors}</li>
                {stressTestResult.memoryBefore && stressTestResult.memoryAfter && (
                  <li>• Memory delta: {formatBytes(stressTestResult.memoryAfter - stressTestResult.memoryBefore)}</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              JS Heap Memory
            </CardTitle>
            <CardDescription>Browser memory usage</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.memory ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span className={getUsageColor(memoryPercentage)}>
                    {formatBytes(stats.memory.usedJSHeapSize)}
                  </span>
                </div>
                <Progress value={memoryPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total: {formatBytes(stats.memory.totalJSHeapSize)}</span>
                  <span>Limit: {formatBytes(stats.memory.jsHeapSizeLimit)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Memory API not available in this browser
              </p>
            )}
          </CardContent>
        </Card>

        {/* LocalStorage Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Local Storage
            </CardTitle>
            <CardDescription>Persistent client storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span className={getUsageColor(storagePercentage)}>
                  {formatBytes(stats.localStorageUsed)}
                </span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{storagePercentage.toFixed(1)}% used</span>
                <span>Limit: ~{formatBytes(stats.localStorageLimit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Application Cache
            </CardTitle>
            <CardDescription>Cached data entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Memory Cache</span>
                <Badge variant="secondary">{stats.cacheStats.memory} entries</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage Cache</span>
                <Badge variant="secondary">{stats.cacheStats.localStorage} entries</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={async () => {
                  await cache.clear();
                  collectStats();
                }}
              >
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            {memoryPercentage > 75 && (
              <li className="text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                High memory usage detected. Consider closing unused tabs or refreshing.
              </li>
            )}
            {storagePercentage > 80 && (
              <li className="text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Local storage is nearly full. Clear cache to free up space.
              </li>
            )}
            {stressTestResult && !stressTestResult.responsive && (
              <li className="text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                UI responsiveness degraded under load. Consider optimizing heavy operations.
              </li>
            )}
            {memoryPercentage < 50 && storagePercentage < 50 && (!stressTestResult || stressTestResult.responsive) && (
              <li className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Resource usage is healthy. Application is performing optimally.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
