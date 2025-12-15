import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  TrendingUp, 
  FileText, 
  FlaskConical, 
  Lightbulb,
  ArrowLeft,
  BarChart3,
  Clock
} from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { ApplicationSuccessAnalysis } from "@/components/analytics/ApplicationSuccessAnalysis";
import { MaterialVersionPerformance } from "@/components/analytics/MaterialVersionPerformance";
import { ABTestingResults } from "@/components/analytics/ABTestingResults";
import { SuccessOptimizationRecommendations } from "@/components/analytics/SuccessOptimizationRecommendations";
import { SuccessTrendVisualization } from "@/components/analytics/SuccessTrendVisualization";
import { ApplicationTimingOptimizer } from "@/components/jobs/ApplicationTimingOptimizer";

export default function SuccessOptimization() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    document.title = "Success Optimization Dashboard | Job Search";
  }, []);

  return (
    <>
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <AppNav />
        
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Success Optimization Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Analyze your application strategies and optimize for better results
                </p>
              </div>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full max-w-4xl bg-muted/50 p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="timing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timing</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Materials</span>
              </TabsTrigger>
              <TabsTrigger value="ab-testing" className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                <span className="hidden sm:inline">A/B Tests</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Full Success Analysis */}
            <TabsContent value="overview" className="space-y-6">
              <ApplicationSuccessAnalysis />
            </TabsContent>

            {/* Timing Optimizer Tab */}
            <TabsContent value="timing" className="space-y-6">
              <ApplicationTimingOptimizer />
            </TabsContent>

            {/* Materials Performance Tab */}
            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resume & Cover Letter Performance
                  </CardTitle>
                  <CardDescription>
                    See which versions of your application materials perform best
                  </CardDescription>
                </CardHeader>
              </Card>
              <MaterialVersionPerformance />
            </TabsContent>

            {/* A/B Testing Tab */}
            <TabsContent value="ab-testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Strategy A/B Testing
                  </CardTitle>
                  <CardDescription>
                    Compare different application strategies with statistical significance testing
                  </CardDescription>
                </CardHeader>
              </Card>
              <ABTestingResults />
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Trends
                  </CardTitle>
                  <CardDescription>
                    Track your improvement over time with trend visualizations
                  </CardDescription>
                </CardHeader>
              </Card>
              <SuccessTrendVisualization />
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <SuccessOptimizationRecommendations />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
