import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, DollarSign, Gift, LineChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CompensationTrendsProps {
  progression: any[];
  analysis?: {
    base_salary_trend?: string;
    bonus_trend?: string;
    equity_trend?: string;
    total_comp_evolution?: string;
  };
}

export function CompensationTrends({ progression, analysis }: CompensationTrendsProps) {
  const chartData = progression.map(entry => ({
    date: new Date(entry.start_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    base: entry.base_salary || 0,
    bonus: entry.bonus || 0,
    equity: entry.equity_value || 0,
    benefits: entry.benefits_value || 0,
    company: entry.company_name,
  }));

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendBadge = (trend?: string) => {
    const variant = trend === 'increasing' ? 'default' : trend === 'decreasing' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{trend || 'stable'}</Badge>;
  };

  // Calculate totals and averages
  const latestEntry = progression[progression.length - 1];
  const firstEntry = progression[0];
  
  const baseGrowth = firstEntry && latestEntry 
    ? ((latestEntry.base_salary - firstEntry.base_salary) / firstEntry.base_salary * 100).toFixed(1)
    : 0;
  
  const bonusAvg = progression.length > 0
    ? progression.reduce((sum, p) => sum + (p.bonus || 0), 0) / progression.length
    : 0;

  const equityAvg = progression.length > 0
    ? progression.reduce((sum, p) => sum + (p.equity_value || 0), 0) / progression.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Base Salary</span>
              </div>
              {getTrendIcon(analysis?.base_salary_trend)}
            </div>
            {getTrendBadge(analysis?.base_salary_trend)}
            <p className="text-xs text-muted-foreground mt-2">
              {baseGrowth}% total growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Bonus</span>
              </div>
              {getTrendIcon(analysis?.bonus_trend)}
            </div>
            {getTrendBadge(analysis?.bonus_trend)}
            <p className="text-xs text-muted-foreground mt-2">
              Avg: ${bonusAvg.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Equity</span>
              </div>
              {getTrendIcon(analysis?.equity_trend)}
            </div>
            {getTrendBadge(analysis?.equity_trend)}
            <p className="text-xs text-muted-foreground mt-2">
              Avg: ${equityAvg.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Comp</span>
              </div>
            </div>
            <p className="text-lg font-bold">
              ${latestEntry?.total_compensation?.toLocaleString() || '--'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current total</p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation Breakdown Over Time</CardTitle>
          <CardDescription>Track how each component of your compensation has evolved</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const total = data.base + data.bonus + data.equity + data.benefits;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.company}</p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p>Base: ${data.base.toLocaleString()}</p>
                              <p>Bonus: ${data.bonus.toLocaleString()}</p>
                              <p>Equity: ${data.equity.toLocaleString()}</p>
                              <p>Benefits: ${data.benefits.toLocaleString()}</p>
                              <p className="font-medium border-t pt-1 mt-1">
                                Total: ${total.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="base" stackId="a" fill="hsl(var(--primary))" name="Base Salary" />
                  <Bar dataKey="bonus" stackId="a" fill="hsl(var(--primary) / 0.7)" name="Bonus" />
                  <Bar dataKey="equity" stackId="a" fill="hsl(var(--primary) / 0.5)" name="Equity" />
                  <Bar dataKey="benefits" stackId="a" fill="hsl(var(--primary) / 0.3)" name="Benefits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No compensation data to display.</p>
              <p className="text-sm mt-1">Add salary entries to see trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolution Summary */}
      {analysis?.total_comp_evolution && (
        <Card>
          <CardHeader>
            <CardTitle>Compensation Evolution Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{analysis.total_comp_evolution}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
