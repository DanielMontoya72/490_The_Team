import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Target, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NegotiationPrediction {
  targetSalary: number;
  predictedOutcome: number;
  confidence: number;
  successProbability: number;
  preparationScore: number;
  marketDataScore: number;
  leverageScore: number;
  recommendations: string[];
  confidenceInterval: { low: number; high: number };
}

export function SalaryNegotiationOutcomePredictor() {
  const [targetSalary, setTargetSalary] = useState('');
  const [currentOfferSalary, setCurrentOfferSalary] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [prediction, setPrediction] = useState<NegotiationPrediction | null>(null);

  const { data: userData } = useQuery({
    queryKey: ['salary-negotiation-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [jobs, salaryResearch, offers] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('salary_research')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['offered', 'accepted'])
      ]);

      return {
        jobs: jobs.data || [],
        salaryResearch: salaryResearch.data || [],
        offers: offers.data || []
      };
    }
  });

  const generatePrediction = () => {
    if (!targetSalary || !currentOfferSalary || !userData) return;

    const target = parseFloat(targetSalary);
    const current = parseFloat(currentOfferSalary);
    const increase = ((target - current) / current) * 100;

    // Calculate preparation score based on salary research
    const hasRecentResearch = userData.salaryResearch.length > 0;
    const preparationScore = hasRecentResearch ? 85 : 50;

    // Calculate market data score
    const marketDataScore = userData.salaryResearch.length > 0 ? 90 : 40;

    // Calculate leverage score based on multiple offers and interview pipeline (case-insensitive)
    const activeOffers = userData.offers.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'offered' || status === 'offer' || status === 'offer received';
    }).length;
    const leverageScore = Math.min(100, 50 + (activeOffers * 20) + (userData.jobs.filter(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'interview' || status === 'phone screen';
    }).length * 5));

    // Predict success probability based on increase percentage
    let baseProbability = 70;
    if (increase <= 5) baseProbability = 90;
    else if (increase <= 10) baseProbability = 75;
    else if (increase <= 15) baseProbability = 60;
    else if (increase <= 20) baseProbability = 45;
    else baseProbability = 30;

    // Adjust based on preparation, market data, and leverage
    const avgScore = (preparationScore + marketDataScore + leverageScore) / 3;
    const successProbability = Math.round(baseProbability * (avgScore / 70));

    // Calculate predicted outcome (weighted average)
    const predictedOutcome = Math.round(current + ((target - current) * (successProbability / 100)));

    // Calculate confidence interval
    const variance = Math.max(0.05, (increase / 100));
    const confidenceInterval = {
      low: Math.round(predictedOutcome * (1 - variance)),
      high: Math.round(predictedOutcome * (1 + variance))
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (!hasRecentResearch) {
      recommendations.push('Complete salary research to strengthen your negotiation position');
    }
    if (increase > 15) {
      recommendations.push('Your target is ambitious. Prepare strong justification based on market data and unique value');
    }
    if (activeOffers < 2) {
      recommendations.push('Having multiple offers significantly improves negotiation leverage');
    }
    if (leverageScore < 60) {
      recommendations.push('Continue interviewing to create competitive pressure');
    }
    if (increase <= 10) {
      recommendations.push('This is a reasonable request with high success probability');
    }
    recommendations.push('Document your achievements and unique value propositions');
    recommendations.push('Practice your negotiation conversation and prepare for counteroffers');

    setPrediction({
      targetSalary: target,
      predictedOutcome,
      confidence: Math.round((preparationScore + marketDataScore + leverageScore) / 3),
      successProbability,
      preparationScore,
      marketDataScore,
      leverageScore,
      recommendations: recommendations.slice(0, 5),
      confidenceInterval
    });
  };

  const getConfidenceColor = (value: number) => {
    if (value >= 75) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Salary Negotiation Outcome Predictor
        </CardTitle>
        <CardDescription>
          Predict negotiation success based on your preparation and market data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="current-offer">Current Offer ($)</Label>
            <Input
              id="current-offer"
              type="number"
              placeholder="100000"
              value={currentOfferSalary}
              onChange={(e) => setCurrentOfferSalary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-salary">Target Salary ($)</Label>
            <Input
              id="target-salary"
              type="number"
              placeholder="115000"
              value={targetSalary}
              onChange={(e) => setTargetSalary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience Level</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger id="experience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid Level (3-7 years)</SelectItem>
                <SelectItem value="senior">Senior (8-12 years)</SelectItem>
                <SelectItem value="lead">Lead/Principal (13+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={generatePrediction} 
              className="w-full"
              disabled={!targetSalary || !currentOfferSalary}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Prediction
            </Button>
          </div>
        </div>

        {prediction && (
          <div className="space-y-6 pt-4 border-t">
            {/* Predicted Outcome */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Predicted Negotiation Outcome</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  ${prediction.predictedOutcome.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Confidence Interval:</span>
                  <Badge variant="outline">
                    ${prediction.confidenceInterval.low.toLocaleString()} - ${prediction.confidenceInterval.high.toLocaleString()}
                  </Badge>
                </div>
                <div className="pt-2">
                  <Badge className={prediction.successProbability >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300'}>
                    {prediction.successProbability}% Success Probability
                  </Badge>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Preparation</span>
                  <span className={getConfidenceColor(prediction.preparationScore)}>
                    {prediction.preparationScore}%
                  </span>
                </div>
                <Progress value={prediction.preparationScore} />
                <p className="text-xs text-muted-foreground">
                  {prediction.preparationScore >= 80 ? 'Well prepared' : 'Needs improvement'}
                </p>
              </div>

              <div className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Market Data</span>
                  <span className={getConfidenceColor(prediction.marketDataScore)}>
                    {prediction.marketDataScore}%
                  </span>
                </div>
                <Progress value={prediction.marketDataScore} />
                <p className="text-xs text-muted-foreground">
                  {prediction.marketDataScore >= 80 ? 'Strong data backing' : 'Limited market data'}
                </p>
              </div>

              <div className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Leverage</span>
                  <span className={getConfidenceColor(prediction.leverageScore)}>
                    {prediction.leverageScore}%
                  </span>
                </div>
                <Progress value={prediction.leverageScore} />
                <p className="text-xs text-muted-foreground">
                  {prediction.leverageScore >= 80 ? 'Strong position' : 'Build more leverage'}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Strategic Recommendations
              </h4>
              <div className="space-y-2">
                {prediction.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  This prediction is based on statistical analysis and your preparation level. 
                  Actual outcomes depend on employer budget, role competitiveness, and negotiation execution. 
                  The confidence interval represents the likely range of outcomes.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
