import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SalaryProgressionChartProps {
  data: any[];
  analysis?: {
    annual_growth_rate?: number;
    total_growth_percentage?: number;
    growth_trend?: string;
    years_to_next_milestone?: number;
    projected_5_year_salary?: number;
    career_stage_assessment?: string;
  };
}

export function SalaryProgressionChart({ data, analysis }: SalaryProgressionChartProps) {
  const chartData = data.map(entry => ({
    date: new Date(entry.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    total: entry.total_compensation,
    base: entry.base_salary,
    bonus: entry.bonus || 0,
    equity: entry.equity_value || 0,
    company: entry.company_name,
    title: entry.job_title,
  }));

  const getTrendIcon = () => {
    switch (analysis?.growth_trend) {
      case 'accelerating':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decelerating':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Salary Progression Over Time</CardTitle>
            <CardDescription>Track your total compensation growth</CardDescription>
          </div>
          {analysis && (
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <Badge variant={analysis.growth_trend === 'accelerating' ? 'default' : 'secondary'}>
                {analysis.growth_trend || 'steady'}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.title}</p>
                            <p className="text-sm text-muted-foreground">{data.company}</p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p>Total: <span className="font-medium">${data.total?.toLocaleString()}</span></p>
                              <p>Base: ${data.base?.toLocaleString()}</p>
                              {data.bonus > 0 && <p>Bonus: ${data.bonus?.toLocaleString()}</p>}
                              {data.equity > 0 && <p>Equity: ${data.equity?.toLocaleString()}</p>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Analysis Summary */}
            {analysis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Annual Growth</p>
                  <p className="text-lg font-semibold">{analysis.annual_growth_rate?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Growth</p>
                  <p className="text-lg font-semibold">{analysis.total_growth_percentage?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">5-Year Projection</p>
                  <p className="text-lg font-semibold">${analysis.projected_5_year_salary?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Years to Milestone</p>
                  <p className="text-lg font-semibold">{analysis.years_to_next_milestone} years</p>
                </div>
              </div>
            )}

            {analysis?.career_stage_assessment && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Career Stage Assessment</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.career_stage_assessment}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No salary data yet. Add your salary history to see progression charts.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
