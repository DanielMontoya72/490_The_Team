import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, CheckCircle2, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface NegotiationPerformanceProps {
  stats: {
    total: number;
    successful: number;
    avgIncrease: number;
  };
  analysis?: {
    success_rate?: number;
    average_increase_achieved?: number;
    total_negotiations?: number;
    successful_negotiations?: number;
    improvement_trend?: string;
    skills_assessment?: string;
  };
  history: any[];
}

export function NegotiationPerformance({ stats, analysis, history }: NegotiationPerformanceProps) {
  const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
  
  const chartData = history.map((item, index) => ({
    name: `#${index + 1}`,
    increase: item.salary_increase_percentage || 0,
    successful: item.negotiation_success,
    jobTitle: item.job_title,
  }));

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-3xl font-bold">{successRate.toFixed(0)}%</p>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.successful} of {stats.total} negotiations successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Avg. Increase</span>
            </div>
            <p className="text-3xl font-bold">{stats.avgIncrease.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              Average salary increase from negotiations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Trend</span>
            </div>
            <Badge variant={
              analysis?.improvement_trend === 'improving' ? 'default' :
              analysis?.improvement_trend === 'declining' ? 'destructive' : 'secondary'
            }>
              {analysis?.improvement_trend || 'Not enough data'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Your negotiation skill trend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Negotiation History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Negotiation History</CardTitle>
          <CardDescription>Track your negotiation outcomes over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.jobTitle}</p>
                            <p className="text-sm">
                              Increase: <span className="font-medium">{data.increase}%</span>
                            </p>
                            <p className="text-sm flex items-center gap-1">
                              {data.successful ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span className="text-green-500">Successful</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-red-500">Unsuccessful</span>
                                </>
                              )}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="increase" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No negotiation history recorded yet.</p>
              <p className="text-sm mt-1">Record outcomes from your salary negotiations to track improvement.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Assessment */}
      {analysis?.skills_assessment && (
        <Card>
          <CardHeader>
            <CardTitle>Skills Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{analysis.skills_assessment}</p>
          </CardContent>
        </Card>
      )}

      {/* Negotiation History List */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Negotiations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.job_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.negotiated_at || item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {item.salary_increase_percentage && (
                      <Badge variant="outline">+{item.salary_increase_percentage}%</Badge>
                    )}
                    {item.negotiation_success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
