import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Target, DollarSign, AlertTriangle, Sparkles, BarChart3, Route, Calendar } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Trajectory {
  pathName: string;
  startingRole: string;
  milestones: Array<{
    year: number;
    role: string;
    salary: number;
    title: string;
    keyAchievements: string[];
  }>;
  totalEarnings: number;
  growthRate: number;
  riskLevel: string;
  satisfactionScore: number;
}

interface SimulationResult {
  trajectories: Trajectory[];
  probabilityDistributions: {
    bestCase: { salary: number; role: string; probability: number };
    averageCase: { salary: number; role: string; probability: number };
    worstCase: { salary: number; role: string; probability: number };
  };
  decisionPoints: Array<{
    year: number;
    description: string;
    options: string[];
    impact: string;
  }>;
  recommendations: {
    optimalPath: string;
    reasoning: string;
    nextSteps: string[];
    skillsToAcquire: string[];
    risksToConsider: string[];
  };
  lifetimeEarnings: {
    conservative: number;
    moderate: number;
    optimistic: number;
  };
  customCriteriaAnalysis?: Record<string, { score: number; analysis: string }>;
}

export function CareerPathSimulator() {
  const [startingRole, setStartingRole] = useState("");
  const [startingSalary, setStartingSalary] = useState("");
  const [startingIndustry, setStartingIndustry] = useState("");
  const [simulationYears, setSimulationYears] = useState(5);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [customCriteria, setCustomCriteria] = useState<Record<string, number>>({
    workLifeBalance: 5,
    learningOpportunities: 5,
    impactPotential: 5,
    jobSecurity: 5,
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const queryClient = useQueryClient();

  // Fetch job offers
  const { data: offers } = useQuery({
    queryKey: ['job-offers', 'all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('job_offers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'accepted']);
      
      return data || [];
    },
  });

  // Fetch saved simulations
  const { data: savedSimulations } = useQuery({
    queryKey: ['career-simulations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('career_path_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      return data || [];
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const selectedOffers = offers?.filter(o => selectedOfferIds.includes(o.id)) || [];
      
      const { data, error } = await supabase.functions.invoke('simulate-career-path', {
        body: {
          startingRole,
          startingSalary: parseFloat(startingSalary) || 0,
          startingIndustry,
          simulationYears,
          customCriteria,
          jobOffers: selectedOffers,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as SimulationResult;
    },
    onSuccess: (data) => {
      setSimulationResult(data);
      toast.success('Career simulation complete!');
    },
    onError: (error: any) => {
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add credits to continue.');
      } else {
        toast.error(error.message || 'Failed to run simulation');
      }
    },
  });

  const saveSimulationMutation = useMutation({
    mutationFn: async () => {
      if (!simulationResult) throw new Error('No simulation to save');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        simulation_name: `${startingRole || 'Career'} - ${simulationYears}yr Simulation`,
        starting_role: startingRole,
        starting_salary: parseFloat(startingSalary) || null,
        starting_industry: startingIndustry,
        simulation_years: simulationYears,
        custom_criteria: customCriteria as any,
        job_offer_ids: selectedOfferIds,
        trajectories: simulationResult.trajectories as any,
        recommendations: simulationResult.recommendations as any,
        probability_distributions: simulationResult.probabilityDistributions as any,
        lifetime_earnings: simulationResult.lifetimeEarnings as any,
        decision_points: simulationResult.decisionPoints as any,
      };

      const { error } = await supabase.from('career_path_simulations').insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-simulations'] });
      toast.success('Simulation saved!');
    },
    onError: () => toast.error('Failed to save simulation'),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleOfferSelection = (offerId: string) => {
    setSelectedOfferIds(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const getChartData = () => {
    if (!simulationResult?.trajectories?.length) return [];
    
    const years = Array.from({ length: simulationYears + 1 }, (_, i) => i);
    return years.map(year => {
      const dataPoint: Record<string, any> = { year: `Year ${year}` };
      simulationResult.trajectories.forEach((traj, idx) => {
        const milestone = traj.milestones.find(m => m.year === year);
        dataPoint[traj.pathName] = milestone?.salary || (year === 0 ? parseFloat(startingSalary) || 0 : null);
      });
      return dataPoint;
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const chartColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="configure">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="results" disabled={!simulationResult}>Results</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedSimulations?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-6 mt-6">
          {/* Current Position */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Position
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Current Role</Label>
                  <Input 
                    value={startingRole} 
                    onChange={(e) => setStartingRole(e.target.value)}
                    placeholder="e.g., Software Engineer" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Salary</Label>
                  <Input 
                    type="number"
                    value={startingSalary} 
                    onChange={(e) => setStartingSalary(e.target.value)}
                    placeholder="e.g., 120000" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input 
                    value={startingIndustry} 
                    onChange={(e) => setStartingIndustry(e.target.value)}
                    placeholder="e.g., Technology" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Offers to Evaluate */}
          {offers && offers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Include Job Offers in Simulation
                </CardTitle>
                <CardDescription>Select offers to compare career trajectories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {offers.map(offer => (
                    <div
                      key={offer.id}
                      onClick={() => toggleOfferSelection(offer.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedOfferIds.includes(offer.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{offer.position_title}</div>
                      <div className="text-sm text-muted-foreground">{offer.company_name}</div>
                      <div className="text-sm font-semibold mt-1">{formatCurrency(offer.base_salary)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simulation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Simulation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Simulation Period</Label>
                  <span className="text-sm font-medium">{simulationYears} years</span>
                </div>
                <Slider
                  value={[simulationYears]}
                  onValueChange={([val]) => setSimulationYears(val)}
                  min={1}
                  max={15}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 year</span>
                  <span>5 years</span>
                  <span>10 years</span>
                  <span>15 years</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Success Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Custom Success Criteria
              </CardTitle>
              <CardDescription>Weight factors that matter most to you (1-10)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(customCriteria).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([val]) => setCustomCriteria(prev => ({ ...prev, [key]: val }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button 
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending || (!startingRole && selectedOfferIds.length === 0)}
            className="w-full"
            size="lg"
          >
            {simulateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Simulation...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Simulate Career Paths
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="results" className="space-y-6 mt-6">
          {simulationResult && (
            <>
              {/* Salary Trajectory Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Salary Projections
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      onClick={() => saveSimulationMutation.mutate()}
                      disabled={saveSimulationMutation.isPending}
                    >
                      {saveSimulationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Simulation'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend />
                        {simulationResult.trajectories.map((traj, idx) => (
                          <Line
                            key={traj.pathName}
                            type="monotone"
                            dataKey={traj.pathName}
                            stroke={chartColors[idx % chartColors.length]}
                            strokeWidth={2}
                            dot={{ fill: chartColors[idx % chartColors.length] }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Career Trajectories */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {simulationResult.trajectories.map((traj, idx) => (
                  <Card key={idx} className={traj.pathName === simulationResult.recommendations.optimalPath ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{traj.pathName}</CardTitle>
                        {traj.pathName === simulationResult.recommendations.optimalPath && (
                          <Badge className="bg-primary">Recommended</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getRiskColor(traj.riskLevel)}>
                          {traj.riskLevel} risk
                        </Badge>
                        <Badge variant="outline">
                          {traj.growthRate}% growth
                        </Badge>
                        <Badge variant="outline">
                          {traj.satisfactionScore}/10 satisfaction
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Earnings ({simulationYears}yr)</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(traj.totalEarnings)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Milestones:</p>
                        {traj.milestones.slice(0, 3).map((m, midx) => (
                          <div key={midx} className="text-xs p-2 bg-muted rounded">
                            <span className="font-medium">Year {m.year}:</span> {m.title} - {formatCurrency(m.salary)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Probability Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Outcome Probability Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Worst Case ({simulationResult.probabilityDistributions.worstCase.probability}%)</p>
                      <p className="text-xl font-bold">{formatCurrency(simulationResult.probabilityDistributions.worstCase.salary)}</p>
                      <p className="text-sm">{simulationResult.probabilityDistributions.worstCase.role}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Case ({simulationResult.probabilityDistributions.averageCase.probability}%)</p>
                      <p className="text-xl font-bold">{formatCurrency(simulationResult.probabilityDistributions.averageCase.salary)}</p>
                      <p className="text-sm">{simulationResult.probabilityDistributions.averageCase.role}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Best Case ({simulationResult.probabilityDistributions.bestCase.probability}%)</p>
                      <p className="text-xl font-bold">{formatCurrency(simulationResult.probabilityDistributions.bestCase.salary)}</p>
                      <p className="text-sm">{simulationResult.probabilityDistributions.bestCase.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Points */}
              {simulationResult.decisionPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Key Decision Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {simulationResult.decisionPoints.map((dp, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Year {dp.year}</Badge>
                            <span className="font-medium">{dp.description}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap mb-2">
                            {dp.options.map((opt, oidx) => (
                              <Badge key={oidx} variant="secondary">{opt}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{dp.impact}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">Optimal Path: {simulationResult.recommendations.optimalPath}</p>
                    <p className="text-sm text-muted-foreground mt-1">{simulationResult.recommendations.reasoning}</p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="font-medium mb-2">Next Steps</p>
                      <ul className="space-y-1">
                        {simulationResult.recommendations.nextSteps.map((step, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Skills to Acquire</p>
                      <div className="flex flex-wrap gap-1">
                        {simulationResult.recommendations.skillsToAcquire.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Risks to Consider
                      </p>
                      <ul className="space-y-1">
                        {simulationResult.recommendations.risksToConsider.map((risk, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Lifetime Earnings */}
                  <div className="pt-4 border-t">
                    <p className="font-medium mb-3">Lifetime Earnings Projection</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Conservative</p>
                        <p className="text-lg font-bold">{formatCurrency(simulationResult.lifetimeEarnings.conservative)}</p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Moderate</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(simulationResult.lifetimeEarnings.moderate)}</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Optimistic</p>
                        <p className="text-lg font-bold">{formatCurrency(simulationResult.lifetimeEarnings.optimistic)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {savedSimulations?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Route className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved simulations yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {savedSimulations?.map((sim: any) => (
                <Card key={sim.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{sim.simulation_name}</CardTitle>
                    <CardDescription>
                      {sim.starting_role} • {sim.simulation_years} year projection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {sim.recommendations?.optimalPath && (
                        <Badge variant="outline">Best: {sim.recommendations.optimalPath}</Badge>
                      )}
                      {sim.lifetime_earnings?.moderate && (
                        <Badge variant="secondary">{formatCurrency(sim.lifetime_earnings.moderate)} lifetime</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(sim.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}