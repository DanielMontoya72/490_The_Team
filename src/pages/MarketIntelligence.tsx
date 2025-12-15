import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, Building2, Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SkillDemandChart } from "@/components/market/SkillDemandChart";
import { MarketTrendsOverview } from "@/components/market/MarketTrendsOverview";
import { CareerInsights } from "@/components/market/CareerInsights";
import { CompanyGrowthTracker } from "@/components/market/CompanyGrowthTracker";
import { SavedSearches } from "@/components/market/SavedSearches";

export default function MarketIntelligence() {
  const [industry, setIndustry] = useState("Technology");
  const [location, setLocation] = useState("");
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: skillTrends } = useQuery({
    queryKey: ['skill-demand-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_demand_trends')
        .select('*')
        .order('analysis_date', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Error fetching skill trends:', error);
        throw error;
      }
      console.log('Fetched skill trends:', data?.length || 0, 'skills');
      return data;
    },
    enabled: !!user
  });

  const { data: marketTrends } = useQuery({
    queryKey: ['market-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_trends')
        .select('*')
        .order('analysis_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: insights } = useQuery({
    queryKey: ['market-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_insights')
        .select('*')
        .eq('acknowledged', false)
        .order('priority_level', { ascending: false })
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: companyGrowth } = useQuery({
    queryKey: ['company-growth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_growth_tracking')
        .select('*')
        .order('analysis_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const generateIntelligence = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to generate intelligence");
      return;
    }

    setGenerating(true);
    try {
      console.log('[MI Frontend] Starting generation for user:', user.id);

      const { error } = await supabase.functions.invoke('generate-market-intelligence', {
        body: { industry, location }
      });
      
      if (error) {
        console.error('[MI Frontend] Edge function error:', error);
        throw error;
      }

      console.log('[MI Frontend] Generation complete, refetching data...');

      // Force refetch all queries
      await queryClient.invalidateQueries({ queryKey: ['skill-demand-trends'] });
      await queryClient.invalidateQueries({ queryKey: ['market-trends'] });
      await queryClient.invalidateQueries({ queryKey: ['market-insights'] });
      await queryClient.invalidateQueries({ queryKey: ['company-growth'] });
      
      toast.success("Market intelligence generated successfully!");
    } catch (error) {
      console.error('[MI Frontend] Generation error:', error);
      toast.error("Failed to generate market intelligence");
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadSearch = (searchIndustry: string, searchLocation: string) => {
    setIndustry(searchIndustry);
    setLocation(searchLocation);
    toast.info("Search parameters loaded. Click Generate to run analysis.");
  };

  const criticalInsights = insights?.filter(i => i.priority_level === 'critical') || [];
  const highInsights = insights?.filter(i => i.priority_level === 'high') || [];

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <TrendingUp className="h-10 w-10 text-primary" />
              Market Intelligence
            </h1>
            <p className="text-muted-foreground mt-2">
              Industry trends, skill demand analysis, and career positioning insights
            </p>
          </div>
        </div>

        {/* Saved Searches */}
        <SavedSearches onLoadSearch={handleLoadSearch} />

        {/* Intelligence Generation Controls */}
        <Card className="mt-8 mb-8">
          <CardHeader>
            <CardTitle>Generate Market Intelligence</CardTitle>
            <CardDescription>
              Get AI-powered insights on job market trends, skill demand, and career opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Target Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco, New York, Remote"
                />
              </div>
            </div>
            <Button 
              onClick={generateIntelligence} 
              disabled={generating || !industry}
              size="lg"
              className="w-full md:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Market Data...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Generate Intelligence Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{skillTrends?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Market Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{marketTrends?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{criticalInsights.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{highInsights.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="skills" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Skill Demand
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Trends
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Career Insights
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <span className="text-yellow-500">★</span>
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            <SkillDemandChart skillTrends={skillTrends || []} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <MarketTrendsOverview trends={marketTrends || []} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <CareerInsights insights={insights || []} />
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <CompanyGrowthTracker companies={companyGrowth || []} />
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            {/* Favorited Skills */}
            {skillTrends?.filter(s => s.is_favorited).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Favorited Skills
                </h3>
                <SkillDemandChart skillTrends={skillTrends?.filter(s => s.is_favorited) || []} />
              </div>
            )}

            {/* Favorited Insights */}
            {insights?.filter(i => i.is_favorited).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Favorited Insights
                </h3>
                <CareerInsights insights={insights?.filter(i => i.is_favorited) || []} />
              </div>
            )}

            {/* Favorited Companies */}
            {companyGrowth?.filter(c => c.is_favorited).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Favorited Companies
                </h3>
                <CompanyGrowthTracker companies={companyGrowth?.filter(c => c.is_favorited) || []} />
              </div>
            )}

            {/* Empty State */}
            {(!skillTrends?.some(s => s.is_favorited) && 
              !insights?.some(i => i.is_favorited) && 
              !companyGrowth?.some(c => c.is_favorited)) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <span className="text-6xl mb-4 block">★</span>
                  <p className="text-muted-foreground text-lg">No favorites yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click the star icon on skills, insights, or companies to save them here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
