import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, TrendingUp, Building2, Users, Gift, Briefcase,
  Download, Search, Loader2, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalaryResearchProps {
  jobId: string;
}

export function SalaryResearch({ jobId }: SalaryResearchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentCompensation, setCurrentCompensation] = useState<string>("");
  const [manualSearch, setManualSearch] = useState(false);
  const [manualJobTitle, setManualJobTitle] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualIndustry, setManualIndustry] = useState("");

  // Fetch latest salary research
  const { data: research, isLoading } = useQuery({
    queryKey: ['salary-research', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_research')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Generate research mutation
  const generateResearch = useMutation({
    mutationFn: async () => {
      const body: any = { 
        currentCompensation: currentCompensation ? parseInt(currentCompensation) : null
      };

      if (manualSearch) {
        if (!manualJobTitle || !manualLocation) {
          throw new Error('Job title and location are required');
        }
        body.manualJobDetails = {
          job_title: manualJobTitle,
          location: manualLocation,
          industry: manualIndustry || 'Not specified'
        };
      } else {
        body.jobId = jobId;
      }

      const { data, error } = await supabase.functions.invoke('research-salary', { body });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-research', jobId] });
      toast({
        title: "Research Complete",
        description: "Salary research has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Research Failed",
        description: error instanceof Error ? error.message : "Failed to generate research",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMarketPositionIcon = (position: string | null) => {
    switch (position) {
      case 'above_market': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'below_market': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'at_market': return <Minus className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getMarketPositionText = (position: string | null) => {
    switch (position) {
      case 'above_market': return 'Above Market';
      case 'below_market': return 'Below Market';
      case 'at_market': return 'At Market';
      default: return 'Unknown';
    }
  };

  const exportReport = () => {
    if (!research) return;
    
    const researchData = research as any;
    const reportData = {
      research_summary: {
        job_title: research.job_title,
        location: research.location,
        industry: researchData.industry || 'N/A',
        generated_date: new Date(research.created_at).toLocaleDateString(),
      },
      salary_overview: {
        salary_range: `${formatCurrency(research.salary_range_min)} - ${formatCurrency(research.salary_range_max)}`,
        median_salary: formatCurrency(research.median_salary),
        percentile_25: formatCurrency(research.percentile_25),
        percentile_75: formatCurrency(research.percentile_75),
      },
      compensation_breakdown: {
        base_salary: formatCurrency(research.base_salary_avg),
        bonus: formatCurrency(research.bonus_avg),
        equity: formatCurrency(research.equity_avg),
        benefits_value: formatCurrency(research.benefits_value),
        total_compensation: formatCurrency(research.total_compensation_avg),
      },
      market_position: research.current_compensation ? {
        your_compensation: formatCurrency(research.current_compensation),
        market_position: getMarketPositionText(research.market_position),
        compensation_gap: research.compensation_gap ? formatCurrency(Math.abs(research.compensation_gap)) : 'N/A',
        gap_direction: research.compensation_gap && research.compensation_gap > 0 ? 'above_market' : 'below_market',
      } : null,
      market_comparisons: Array.isArray(research.market_comparisons) ? research.market_comparisons : [],
      similar_positions: Array.isArray(research.similar_positions) ? research.similar_positions : [],
      historical_trends: Array.isArray(research.historical_trends) ? research.historical_trends : [],
      negotiation_recommendations: Array.isArray(research.negotiation_recommendations) ? research.negotiation_recommendations : [],
      competitive_analysis: research.competitive_analysis,
    };

    // Create CSV for easier viewing
    const csvContent = [
      ['Salary Research Report'],
      [''],
      ['Job Title', research.job_title],
      ['Location', research.location],
      ['Industry', researchData.industry || 'N/A'],
      ['Generated', new Date(research.created_at).toLocaleDateString()],
      [''],
      ['Salary Information'],
      ['Minimum', formatCurrency(research.salary_range_min)],
      ['Median', formatCurrency(research.median_salary)],
      ['Maximum', formatCurrency(research.salary_range_max)],
      ['25th Percentile', formatCurrency(research.percentile_25)],
      ['75th Percentile', formatCurrency(research.percentile_75)],
      [''],
      ['Total Compensation'],
      ['Base Salary', formatCurrency(research.base_salary_avg)],
      ['Bonus', formatCurrency(research.bonus_avg)],
      ['Equity', formatCurrency(research.equity_avg)],
      ['Benefits', formatCurrency(research.benefits_value)],
      ['Total', formatCurrency(research.total_compensation_avg)],
    ];

    if (research.current_compensation) {
      csvContent.push(
        [''],
        ['Your Position'],
        ['Current Compensation', formatCurrency(research.current_compensation)],
        ['Market Position', getMarketPositionText(research.market_position)],
        ['Gap', research.compensation_gap ? formatCurrency(Math.abs(research.compensation_gap)) : 'N/A']
      );
    }

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const csvBlob = new Blob([csvString], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `salary-research-${research.job_title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    // Also create JSON with full data
    const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `salary-research-${research.job_title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    toast({
      title: "Reports Exported",
      description: "Salary research exported as CSV and JSON files.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!research) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Salary Research
          </CardTitle>
          <CardDescription>
            Research market salary data for any role or location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              variant={!manualSearch ? "default" : "outline"}
              onClick={() => setManualSearch(false)}
            >
              Research This Job
            </Button>
            <Button
              size="sm"
              variant={manualSearch ? "default" : "outline"}
              onClick={() => setManualSearch(true)}
            >
              Research Any Role
            </Button>
          </div>

          {manualSearch && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="manual-title">Job Title *</Label>
                <Input
                  id="manual-title"
                  placeholder="e.g., Senior Software Engineer"
                  value={manualJobTitle}
                  onChange={(e) => setManualJobTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-location">Location *</Label>
                <Input
                  id="manual-location"
                  placeholder="e.g., San Francisco, CA"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-industry">Industry (Optional)</Label>
                <Input
                  id="manual-industry"
                  placeholder="e.g., Technology"
                  value={manualIndustry}
                  onChange={(e) => setManualIndustry(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-comp">Your Current Compensation (Optional)</Label>
            <Input
              id="current-comp"
              type="number"
              placeholder="e.g., 85000"
              value={currentCompensation}
              onChange={(e) => setCurrentCompensation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Providing your current compensation helps compare with market rates
            </p>
          </div>
          <Button
            onClick={() => generateResearch.mutate()}
            disabled={generateResearch.isPending}
            className="w-full"
          >
            {generateResearch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Research Salary Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const salaryData = research as any;
  const marketComparisons = Array.isArray(salaryData.market_comparisons) ? salaryData.market_comparisons : [];
  const similarPositions = Array.isArray(salaryData.similar_positions) ? salaryData.similar_positions : [];
  const historicalTrends = Array.isArray(salaryData.historical_trends) ? salaryData.historical_trends : [];
  const negotiationRecs = Array.isArray(salaryData.negotiation_recommendations) ? salaryData.negotiation_recommendations : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Research
            </CardTitle>
            <CardDescription>
              Researched on {new Date(research.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportReport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => generateResearch.mutate()}
              disabled={generateResearch.isPending}
            >
              {generateResearch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Market Position Overview */}
        {research.current_compensation && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Position</p>
                <div className="flex items-center gap-2 mt-1">
                  {getMarketPositionIcon(research.market_position)}
                  <p className="font-semibold">{getMarketPositionText(research.market_position)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Gap</p>
                <p className={cn(
                  "font-semibold",
                  research.compensation_gap && research.compensation_gap > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {research.compensation_gap ? formatCurrency(Math.abs(research.compensation_gap)) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Salary Range Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Salary Range</p>
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(research.salary_range_min)} - {formatCurrency(research.salary_range_max)}
            </p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Median Salary</p>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(research.median_salary)}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Comp</p>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(research.total_compensation_avg)}</p>
          </div>
        </div>

        {/* Percentile Distribution */}
        <div className="mb-6 p-4 rounded-lg border">
          <h3 className="font-semibold mb-3">Salary Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>25th Percentile</span>
                <span className="font-medium">{formatCurrency(research.percentile_25)}</span>
              </div>
              <Progress value={25} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Median (50th)</span>
                <span className="font-medium">{formatCurrency(research.median_salary)}</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>75th Percentile</span>
                <span className="font-medium">{formatCurrency(research.percentile_75)}</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="comparisons">Compare</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="negotiate">Negotiate</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Research Factors */}
          {(research.location || research.experience_level || research.company_size) && (
            <div className="bg-[#1E90FF]/10 rounded-lg p-4 border border-[#1E90FF]/30 mb-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Research Factors
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {research.location && (
                  <div>
                    <p className="text-muted-foreground mb-1">Location</p>
                    <p className="font-medium">{research.location}</p>
                  </div>
                )}
                {research.experience_level && (
                  <div>
                    <p className="text-muted-foreground mb-1">Experience</p>
                    <p className="font-medium capitalize">{research.experience_level.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {research.company_size && (
                  <div>
                    <p className="text-muted-foreground mb-1">Company Size</p>
                    <p className="font-medium">{research.company_size}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compensation Breakdown */}
          <TabsContent value="breakdown" className="space-y-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs whitespace-nowrap">Base Salary</span>
                </div>
                <span className="ml-auto font-semibold text-xs whitespace-nowrap">{formatCurrency(research.base_salary_avg)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs whitespace-nowrap">Bonus</span>
                </div>
                <span className="ml-auto font-semibold text-xs whitespace-nowrap">{formatCurrency(research.bonus_avg)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs whitespace-nowrap">Equity/Stock</span>
                </div>
                <span className="ml-auto font-semibold text-xs whitespace-nowrap">{formatCurrency(research.equity_avg)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs whitespace-nowrap">Benefits Value</span>
                </div>
                <span className="ml-auto font-semibold text-xs whitespace-nowrap">{formatCurrency(research.benefits_value)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-primary/5">
                <span className="font-semibold text-xs whitespace-nowrap">Total Compensation</span>
                <span className="ml-auto font-bold text-sm whitespace-nowrap">{formatCurrency(research.total_compensation_avg)}</span>
              </div>
            </div>
          </TabsContent>

          {/* Market Comparisons */}
          <TabsContent value="comparisons" className="space-y-2">
            {marketComparisons.length > 0 ? (
              marketComparisons.map((comp: any, index: number) => (
                <div key={index} className="p-2 rounded-lg border space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-semibold text-xs break-words">{comp.position}</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="break-words">{comp.company}</span>
                        </p>
                        <p className="text-xs text-muted-foreground pl-5 break-words">
                          {comp.location}
                        </p>
                      </div>
                      {comp.company_size && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          {comp.company_size} employees
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] whitespace-nowrap flex-shrink-0">{formatCurrency(comp.total_comp)}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-[10px] whitespace-nowrap">Base</p>
                      <p className="font-medium text-xs whitespace-nowrap">{formatCurrency(comp.base)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-[10px] whitespace-nowrap">Bonus</p>
                      <p className="font-medium text-xs whitespace-nowrap">{formatCurrency(comp.bonus)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-[10px] whitespace-nowrap">Equity</p>
                      <p className="font-medium text-xs whitespace-nowrap">{formatCurrency(comp.equity)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No comparison data available
              </p>
            )}

            {similarPositions.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Similar Positions</h3>
                <div className="space-y-2">
                  {similarPositions.map((pos: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm break-words">{pos.title}</p>
                          <p className="text-xs text-muted-foreground">{pos.salary_range}</p>
                        </div>
                        {pos.requirements_match && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">{pos.requirements_match}% match</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Historical Trends */}
          <TabsContent value="trends" className="space-y-2">
            {historicalTrends.length > 0 ? (
              <div className="space-y-2">
                {historicalTrends.map((trend: any, index: number) => (
                  <div key={index} className="p-2 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-xs">{trend.year}</p>
                      <Badge variant={trend.trend === 'increasing' ? 'default' : 'secondary'} className="text-[10px] whitespace-nowrap ml-auto">
                        {trend.change_percent > 0 ? '+' : ''}{trend.change_percent}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Median Salary</span>
                      <span className="font-medium ml-auto whitespace-nowrap">{formatCurrency(trend.median)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No historical trend data available
              </p>
            )}
          </TabsContent>

          {/* Negotiation Recommendations */}
          <TabsContent value="negotiate" className="space-y-3">
            {negotiationRecs.length > 0 ? (
              negotiationRecs.map((rec: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'} className="text-xs whitespace-nowrap flex-shrink-0">
                      {rec.priority}
                    </Badge>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="font-semibold text-sm">{rec.strategy}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.expected_impact}</p>
                      {rec.talking_points && rec.talking_points.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs font-medium">Key Talking Points:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {rec.talking_points.map((point: string, pIndex: number) => (
                              <li key={pIndex}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No negotiation recommendations available
              </p>
            )}
          </TabsContent>

          {/* Competitive Analysis */}
          <TabsContent value="analysis">
            <div className="p-3 rounded-lg border">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {research.competitive_analysis || 'No competitive analysis available'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}