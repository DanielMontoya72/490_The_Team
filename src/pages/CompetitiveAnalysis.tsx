import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, TrendingUp, Target, Lightbulb, Award, AlertCircle } from "lucide-react";
import { CompetitivePositioning } from "@/components/competitive/CompetitivePositioning";
import { PeerComparison } from "@/components/competitive/PeerComparison";
import { SkillGapsComparison } from "@/components/competitive/SkillGapsComparison";
import { DifferentiationStrategies } from "@/components/competitive/DifferentiationStrategies";
import { MarketPositioning } from "@/components/competitive/MarketPositioning";
import { PerformanceMetrics } from "@/components/competitive/PerformanceMetrics";
import { CompetitiveRecommendations } from "@/components/competitive/CompetitiveRecommendations";

export default function CompetitiveAnalysis() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: latestAnalysis, isLoading } = useQuery({
    queryKey: ['competitive-analysis', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('competitive_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-competitive-analysis');
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive-analysis'] });
      toast.success("Competitive analysis generated successfully");
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast.error("Failed to generate competitive analysis");
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!latestAnalysis) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Competitive Analysis & Benchmarking
            </CardTitle>
            <CardDescription>
              Get insights on how you compare to other professionals in your field
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first competitive analysis to see how you stack up against other professionals
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
              {isGenerating ? 'Generating Analysis...' : 'Generate Competitive Analysis'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competitive Analysis</h1>
          <p className="text-muted-foreground">
            Understand your market position and competitive advantages
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Refresh Analysis'}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Last updated: {new Date(latestAnalysis.analysis_date).toLocaleDateString()}
      </div>

      <CompetitiveRecommendations data={latestAnalysis.recommendations as any[]} />

      <Tabs defaultValue="positioning" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="positioning">
            <Target className="w-4 h-4 mr-2" />
            Positioning
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <BarChart3 className="w-4 h-4 mr-2" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="skills">
            <AlertCircle className="w-4 h-4 mr-2" />
            Skill Gaps
          </TabsTrigger>
          <TabsTrigger value="differentiation">
            <Lightbulb className="w-4 h-4 mr-2" />
            Strategies
          </TabsTrigger>
          <TabsTrigger value="market">
            <TrendingUp className="w-4 h-4 mr-2" />
            Market
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Award className="w-4 h-4 mr-2" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positioning">
          <CompetitivePositioning data={latestAnalysis.competitive_positioning} />
        </TabsContent>

        <TabsContent value="comparison">
          <PeerComparison data={latestAnalysis.peer_comparison} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillGapsComparison data={latestAnalysis.skill_gaps as any[]} />
        </TabsContent>

        <TabsContent value="differentiation">
          <DifferentiationStrategies data={latestAnalysis.differentiation_strategies as any[]} />
        </TabsContent>

        <TabsContent value="market">
          <MarketPositioning data={latestAnalysis.market_positioning} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMetrics data={latestAnalysis.performance_metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
