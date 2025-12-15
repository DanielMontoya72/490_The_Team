import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Lightbulb } from "lucide-react";

interface JobOffer {
  id: string;
  company_name: string;
  position_title: string;
  location: string | null;
  remote_policy: string | null;
  base_salary: number;
  signing_bonus: number;
  annual_bonus_percent: number;
  equity_value: number;
  equity_vesting_years: number;
  health_insurance_value: number;
  retirement_match_percent: number;
  pto_days: number;
  total_compensation: number | null;
  adjusted_compensation: number | null;
  cost_of_living_index: number;
  culture_fit_score: number | null;
  growth_opportunity_score: number | null;
  work_life_balance_score: number | null;
  job_security_score: number | null;
  commute_score: number | null;
  weighted_score: number | null;
}

export function OfferComparisonMatrix() {
  const { data: offers, isLoading } = useQuery({
    queryKey: ['job-offers', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'accepted'])
        .order('total_compensation', { ascending: false });

      if (error) throw error;
      return data as JobOffer[];
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getScoreColor = (score: number | null, max: number = 10) => {
    if (!score) return 'text-muted-foreground';
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBestValue = (field: keyof JobOffer, higher = true) => {
    if (!offers?.length) return null;
    const values = offers.map(o => o[field] as number).filter(v => v != null);
    return higher ? Math.max(...values) : Math.min(...values);
  };

  const generateNegotiationTips = (offer: JobOffer) => {
    const tips: string[] = [];
    const maxTotal = getBestValue('total_compensation');
    const maxBase = getBestValue('base_salary');
    
    if (maxTotal && offer.total_compensation && offer.total_compensation < maxTotal * 0.95) {
      const diff = maxTotal - offer.total_compensation;
      tips.push(`Total comp is ${formatCurrency(diff)} below the best offer. Consider negotiating.`);
    }
    
    if (offer.signing_bonus === 0 && offers?.some(o => o.signing_bonus > 0)) {
      tips.push("No signing bonus - request one to match other offers.");
    }
    
    if (offer.equity_value === 0 && offers?.some(o => o.equity_value > 0)) {
      tips.push("No equity - ask about stock options or RSUs.");
    }
    
    if (offer.pto_days < 20) {
      tips.push("PTO is below average - consider negotiating more days.");
    }
    
    if (tips.length === 0) {
      tips.push("This is a competitive offer. Focus on non-monetary perks.");
    }
    
    return tips;
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  if (!offers || offers.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Add at least 2 offers to compare them side by side.</p>
        </CardContent>
      </Card>
    );
  }

  const bestTotalComp = getBestValue('total_compensation');
  const bestAdjustedComp = getBestValue('adjusted_compensation');

  return (
    <div className="space-y-6">
      {/* Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Side-by-Side Comparison
          </CardTitle>
          <CardDescription>Compare all dimensions of your offers</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Metric</th>
                {offers.map(offer => (
                  <th key={offer.id} className="text-center py-3 px-4 font-medium min-w-[150px]">
                    <div>{offer.company_name}</div>
                    <div className="text-xs text-muted-foreground font-normal">{offer.position_title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Compensation */}
              <tr className="bg-muted/50">
                <td className="py-2 px-2 font-medium" colSpan={offers.length + 1}>Compensation</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Base Salary</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${offer.base_salary === getBestValue('base_salary') ? 'font-bold text-green-600' : ''}`}>
                    {formatCurrency(offer.base_salary)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Signing Bonus</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${offer.signing_bonus === getBestValue('signing_bonus') && offer.signing_bonus > 0 ? 'font-bold text-green-600' : ''}`}>
                    {formatCurrency(offer.signing_bonus)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Annual Bonus</td>
                {offers.map(offer => (
                  <td key={offer.id} className="text-center py-2 px-4">
                    {offer.annual_bonus_percent}%
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Equity (Annual)</td>
                {offers.map(offer => (
                  <td key={offer.id} className="text-center py-2 px-4">
                    {formatCurrency(offer.equity_value / (offer.equity_vesting_years || 4))}
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-primary/5">
                <td className="py-2 px-2 font-medium">Total Compensation</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 font-bold ${offer.total_compensation === bestTotalComp ? 'text-green-600' : ''}`}>
                    {formatCurrency(offer.total_compensation)}
                    {offer.total_compensation === bestTotalComp && <Trophy className="inline h-4 w-4 ml-1" />}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">COL-Adjusted Comp</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${offer.adjusted_compensation === bestAdjustedComp ? 'font-bold text-green-600' : ''}`}>
                    {formatCurrency(offer.adjusted_compensation)}
                    <div className="text-xs text-muted-foreground">COL: {offer.cost_of_living_index}</div>
                  </td>
                ))}
              </tr>

              {/* Benefits */}
              <tr className="bg-muted/50">
                <td className="py-2 px-2 font-medium" colSpan={offers.length + 1}>Benefits</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Health Insurance</td>
                {offers.map(offer => (
                  <td key={offer.id} className="text-center py-2 px-4">
                    {formatCurrency(offer.health_insurance_value)}/yr
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">401k Match</td>
                {offers.map(offer => (
                  <td key={offer.id} className="text-center py-2 px-4">
                    {offer.retirement_match_percent}%
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">PTO Days</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${offer.pto_days === getBestValue('pto_days') ? 'font-bold text-green-600' : ''}`}>
                    {offer.pto_days} days
                  </td>
                ))}
              </tr>

              {/* Non-Financial Scores */}
              <tr className="bg-muted/50">
                <td className="py-2 px-2 font-medium" colSpan={offers.length + 1}>Non-Financial Factors</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Culture Fit</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${getScoreColor(offer.culture_fit_score)}`}>
                    {offer.culture_fit_score || '-'}/10
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Growth Opportunities</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${getScoreColor(offer.growth_opportunity_score)}`}>
                    {offer.growth_opportunity_score || '-'}/10
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Work-Life Balance</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${getScoreColor(offer.work_life_balance_score)}`}>
                    {offer.work_life_balance_score || '-'}/10
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2">Job Security</td>
                {offers.map(offer => (
                  <td key={offer.id} className={`text-center py-2 px-4 ${getScoreColor(offer.job_security_score)}`}>
                    {offer.job_security_score || '-'}/10
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-primary/5">
                <td className="py-2 px-2 font-medium">Weighted Score</td>
                {offers.map(offer => (
                  <td key={offer.id} className="text-center py-2 px-4">
                    <Progress value={(offer.weighted_score || 0) * 10} className="h-2" />
                    <span className="text-xs mt-1 block">{offer.weighted_score?.toFixed(1) || '-'}/10</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Negotiation Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Negotiation Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {offers.map(offer => (
              <Card key={offer.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{offer.company_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {generateNegotiationTips(offer).map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
