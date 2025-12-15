import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  TrendingUp, 
  RefreshCw, 
  Info, 
  BarChart3,
  AlertCircle,
  Database
} from "lucide-react";
import { toast } from "sonner";

interface BLSSalaryBenchmarksProps {
  jobTitle: string;
  location?: string;
  currentSalaryMin?: number;
  currentSalaryMax?: number;
}

interface SalaryBenchmarkData {
  occupation_code: string;
  occupation_title: string;
  location_code: string;
  location_name: string;
  percentile_10: number | null;
  percentile_25: number | null;
  median_salary: number | null;
  percentile_75: number | null;
  percentile_90: number | null;
  mean_salary: number | null;
  annual_total_employment: number | null;
  data_year: number;
  data_source: string;
  fetched_at?: string;
  expires_at?: string;
}

export function BLSSalaryBenchmarks({ 
  jobTitle, 
  location, 
  currentSalaryMin, 
  currentSalaryMax 
}: BLSSalaryBenchmarksProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: benchmarkResult, isLoading, refetch, error } = useQuery({
    queryKey: ['bls-salary-benchmark', jobTitle, location],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-bls-salary', {
        body: { jobTitle, location },
      });

      if (error) throw error;
      return data as { success: boolean; data: SalaryBenchmarkData | null; cached: boolean; message?: string };
    },
    enabled: !!jobTitle,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-bls-salary', {
        body: { jobTitle, location, forceRefresh: true },
      });
      
      if (error) throw error;
      
      await refetch();
      toast.success('Salary data refreshed');
    } catch (err) {
      toast.error('Failed to refresh salary data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculatePercentilePosition = (currentSalary: number, data: SalaryBenchmarkData) => {
    if (!data.percentile_25 || !data.median_salary || !data.percentile_75) return null;
    
    if (currentSalary < data.percentile_25) {
      return { percentile: 25, position: 'below', label: 'Below 25th percentile' };
    } else if (currentSalary < data.median_salary) {
      return { percentile: 50, position: 'below-median', label: '25th - 50th percentile' };
    } else if (currentSalary < data.percentile_75) {
      return { percentile: 75, position: 'above-median', label: '50th - 75th percentile' };
    } else {
      return { percentile: 90, position: 'above', label: 'Above 75th percentile' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">BLS Salary Benchmarks</CardTitle>
          </div>
          <CardDescription>Loading salary data from Bureau of Labor Statistics...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !benchmarkResult?.success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">BLS Salary Benchmarks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {benchmarkResult?.message || 'Unable to fetch salary benchmark data for this position.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const data = benchmarkResult.data;
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">BLS Salary Benchmarks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No salary data available for "{jobTitle}". Try a more common job title.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const currentSalary = currentSalaryMin && currentSalaryMax 
    ? (currentSalaryMin + currentSalaryMax) / 2 
    : currentSalaryMin || currentSalaryMax;
    
  const position = currentSalary ? calculatePercentilePosition(currentSalary, data) : null;

  // Calculate max value for progress bars
  const maxSalary = Math.max(
    data.percentile_90 || 0,
    currentSalary || 0
  ) * 1.1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">BLS Salary Benchmarks</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {data.occupation_title} • {data.location_name}
                {benchmarkResult.cached && (
                  <Badge variant="outline" className="text-xs">Cached</Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Percentile Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Salary Distribution
          </h4>
          
          <div className="space-y-3">
            {[
              { label: '10th Percentile', value: data.percentile_10, color: 'bg-red-500' },
              { label: '25th Percentile', value: data.percentile_25, color: 'bg-orange-500' },
              { label: 'Median (50th)', value: data.median_salary, color: 'bg-primary' },
              { label: '75th Percentile', value: data.percentile_75, color: 'bg-green-500' },
              { label: '90th Percentile', value: data.percentile_90, color: 'bg-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full ${color} rounded-full transition-all`}
                    style={{ width: `${((value || 0) / maxSalary) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Salary Position */}
        {currentSalary && position && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Your Position</span>
              </div>
              <Badge variant={
                position.position === 'above' ? 'default' :
                position.position === 'above-median' ? 'secondary' :
                'outline'
              }>
                {position.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Listed Salary Range</span>
                <span className="font-medium">
                  {formatCurrency(currentSalaryMin)} - {formatCurrency(currentSalaryMax)}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  style={{ width: `${(currentSalary / maxSalary) * 100}%` }}
                />
                {data.median_salary && (
                  <div 
                    className="absolute top-0 w-0.5 h-full bg-foreground/50"
                    style={{ left: `${(data.median_salary / maxSalary) * 100}%` }}
                    title="Market Median"
                  />
                )}
              </div>
            </div>
            
            {/* Gap Analysis */}
            {data.median_salary && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {currentSalary >= data.median_salary ? (
                      <span className="text-green-600 dark:text-green-400">
                        {formatCurrency(currentSalary - data.median_salary)} above median
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {formatCurrency(data.median_salary - currentSalary)} below median
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mean Salary */}
        {data.mean_salary && (
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Mean (Average) Salary</span>
            <span className="font-medium">{formatCurrency(data.mean_salary)}</span>
          </div>
        )}

        {/* Data Source Disclaimer */}
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Data from U.S. Bureau of Labor Statistics ({data.data_year} data). 
            Actual salaries may vary based on experience, company, and specific location.
            {data.data_source.includes('Estimated') && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Note: These are estimated values based on occupation category.
              </span>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}