import { useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { AnalyticsSidebar } from "@/components/layout/AnalyticsSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, DollarSign, TrendingUp, GitCompare, Activity, 
  Map, Brain, Sparkles, Award, Timer, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AnalyticsHub() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <AnalyticsSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-bold">Analytics Hub</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Your central command center for job market insights, salary analysis, and career analytics
                </p>
              </div>

              <div className="space-y-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card className="border-2 border-blue-200 dark:border-blue-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                          <BarChart3 className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">{jobs?.length || 0}</div>
                          <p className="text-xs text-muted-foreground">Applications tracked</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-green-200 dark:border-green-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">7.2d</div>
                          <p className="text-xs text-muted-foreground">Days to response</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-purple-200 dark:border-purple-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                          <Award className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">23%</div>
                          <p className="text-xs text-muted-foreground">Interview rate</p>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-orange-200 dark:border-orange-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg Salary</CardTitle>
                          <DollarSign className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">$85k</div>
                          <p className="text-xs text-muted-foreground">Expected range</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Job Statistics
                          </CardTitle>
                          <CardDescription>
                            View detailed statistics about your job applications
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to="/stats">
                            <Button variant="outline" className="w-full">
                              View Stats
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Salary Analytics
                          </CardTitle>
                          <CardDescription>
                            Analyze salary trends and compensation insights
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to="/salary-analytics">
                            <Button variant="outline" className="w-full">
                              View Salaries
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Predictive Analytics
                          </CardTitle>
                          <CardDescription>
                            AI-powered predictions and market insights
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to="/predictive-analytics">
                            <Button variant="outline" className="w-full">
                              View Predictions
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <GitCompare className="h-5 w-5 text-primary" />
                            Offer Comparison
                          </CardTitle>
                          <CardDescription>
                            Compare and analyze job offers side by side
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to="/offer-comparison">
                            <Button variant="outline" className="w-full">
                              Compare Offers
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>

                
                      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Map className="h-5 w-5 text-primary" />
                            Job Map
                          </CardTitle>
                          <CardDescription>
                            Visual map of job opportunities and market trends
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to="/job-map">
                            <Button variant="outline" className="w-full">
                              Explore Map
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}