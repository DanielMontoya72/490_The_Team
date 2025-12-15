import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, TrendingUp, ArrowRight } from "lucide-react";

interface JobOffer {
  id: string;
  company_name: string;
  position_title: string;
  base_salary: number;
  signing_bonus: number;
  annual_bonus_percent: number;
  equity_value: number;
  equity_vesting_years: number;
  total_compensation: number | null;
  adjusted_compensation: number | null;
}

export function OfferScenarioAnalysis() {
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [salaryAdjustment, setSalaryAdjustment] = useState("");
  const [signingBonusAdjustment, setSigningBonusAdjustment] = useState("");
  const [equityAdjustment, setEquityAdjustment] = useState("");
  const [bonusAdjustment, setBonusAdjustment] = useState("");

  const { data: offers } = useQuery({
    queryKey: ['job-offers', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobOffer[];
    },
  });

  const selectedOffer = offers?.find(o => o.id === selectedOfferId);

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateScenario = () => {
    if (!selectedOffer) return null;

    const salaryPct = parseFloat(salaryAdjustment) || 0;
    const signingAdd = parseFloat(signingBonusAdjustment) || 0;
    const equityPct = parseFloat(equityAdjustment) || 0;
    const bonusPct = parseFloat(bonusAdjustment) || 0;

    const newBaseSalary = selectedOffer.base_salary * (1 + salaryPct / 100);
    const newSigningBonus = selectedOffer.signing_bonus + signingAdd;
    const newEquity = selectedOffer.equity_value * (1 + equityPct / 100);
    const newBonusPercent = selectedOffer.annual_bonus_percent + bonusPct;

    const vestingYears = selectedOffer.equity_vesting_years || 4;
    const annualBonus = newBaseSalary * (newBonusPercent / 100);
    const annualEquity = newEquity / vestingYears;

    const newTotalComp = newBaseSalary + annualBonus + annualEquity + (newSigningBonus / 4);
    const originalTotalComp = selectedOffer.total_compensation || 0;
    const difference = newTotalComp - originalTotalComp;

    return {
      original: {
        baseSalary: selectedOffer.base_salary,
        signingBonus: selectedOffer.signing_bonus,
        equity: selectedOffer.equity_value,
        bonusPercent: selectedOffer.annual_bonus_percent,
        totalComp: originalTotalComp,
      },
      scenario: {
        baseSalary: newBaseSalary,
        signingBonus: newSigningBonus,
        equity: newEquity,
        bonusPercent: newBonusPercent,
        totalComp: newTotalComp,
      },
      difference,
      percentChange: (difference / originalTotalComp) * 100,
    };
  };

  const scenario = calculateScenario();

  const presetScenarios = [
    { label: "+10% Salary", salary: 10, signing: 0, equity: 0, bonus: 0 },
    { label: "+15% Salary", salary: 15, signing: 0, equity: 0, bonus: 0 },
    { label: "+$25k Signing", salary: 0, signing: 25000, equity: 0, bonus: 0 },
    { label: "+20% Equity", salary: 0, signing: 0, equity: 20, bonus: 0 },
    { label: "Aggressive Ask", salary: 15, signing: 25000, equity: 25, bonus: 5 },
  ];

  const applyPreset = (preset: typeof presetScenarios[0]) => {
    setSalaryAdjustment(preset.salary.toString());
    setSigningBonusAdjustment(preset.signing.toString());
    setEquityAdjustment(preset.equity.toString());
    setBonusAdjustment(preset.bonus.toString());
  };

  const resetScenario = () => {
    setSalaryAdjustment("");
    setSigningBonusAdjustment("");
    setEquityAdjustment("");
    setBonusAdjustment("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Scenario Analysis
          </CardTitle>
          <CardDescription>
            Explore "what if" scenarios to see how negotiations would impact your total compensation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select an offer to analyze</Label>
            <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an offer..." />
              </SelectTrigger>
              <SelectContent>
                {offers?.map(offer => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.company_name} - {offer.position_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOffer && (
            <>
              <div className="flex flex-wrap gap-2">
                <Label className="w-full text-sm text-muted-foreground">Quick Scenarios:</Label>
                {presetScenarios.map((preset, idx) => (
                  <Button key={idx} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                    {preset.label}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={resetScenario}>Reset</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Salary Change (%)</Label>
                  <Input 
                    type="number" 
                    value={salaryAdjustment} 
                    onChange={(e) => setSalaryAdjustment(e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signing Bonus Add ($)</Label>
                  <Input 
                    type="number" 
                    value={signingBonusAdjustment} 
                    onChange={(e) => setSigningBonusAdjustment(e.target.value)}
                    placeholder="e.g., 25000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equity Change (%)</Label>
                  <Input 
                    type="number" 
                    value={equityAdjustment} 
                    onChange={(e) => setEquityAdjustment(e.target.value)}
                    placeholder="e.g., 20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus % Add</Label>
                  <Input 
                    type="number" 
                    value={bonusAdjustment} 
                    onChange={(e) => setBonusAdjustment(e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {scenario && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Scenario Results: {selectedOffer?.company_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Original */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Original Offer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base Salary</span>
                    <span>{formatCurrency(scenario.original.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Signing Bonus</span>
                    <span>{formatCurrency(scenario.original.signingBonus)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Equity (total)</span>
                    <span>{formatCurrency(scenario.original.equity)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bonus %</span>
                    <span>{scenario.original.bonusPercent}%</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Comp</span>
                      <span>{formatCurrency(scenario.original.totalComp)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Scenario */}
              <Card className="border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Negotiated Scenario
                    {scenario.difference > 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        +{scenario.percentChange.toFixed(1)}%
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base Salary</span>
                    <span className={scenario.scenario.baseSalary > scenario.original.baseSalary ? 'text-green-600 font-medium' : ''}>
                      {formatCurrency(scenario.scenario.baseSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Signing Bonus</span>
                    <span className={scenario.scenario.signingBonus > scenario.original.signingBonus ? 'text-green-600 font-medium' : ''}>
                      {formatCurrency(scenario.scenario.signingBonus)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Equity (total)</span>
                    <span className={scenario.scenario.equity > scenario.original.equity ? 'text-green-600 font-medium' : ''}>
                      {formatCurrency(scenario.scenario.equity)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bonus %</span>
                    <span className={scenario.scenario.bonusPercent > scenario.original.bonusPercent ? 'text-green-600 font-medium' : ''}>
                      {scenario.scenario.bonusPercent}%
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-primary">
                      <span>Total Comp</span>
                      <span>{formatCurrency(scenario.scenario.totalComp)}</span>
                    </div>
                    {scenario.difference > 0 && (
                      <div className="text-sm text-green-600 text-right mt-1">
                        +{formatCurrency(scenario.difference)}/year
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {scenario.difference > 0 && (
              <Card className="mt-4 bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm">
                    <strong>Negotiation Impact:</strong> If successful, this negotiation would increase your 
                    total annual compensation by <strong className="text-green-600">{formatCurrency(scenario.difference)}</strong> ({scenario.percentChange.toFixed(1)}%). 
                    Over 4 years, that's an additional <strong className="text-green-600">{formatCurrency(scenario.difference * 4)}</strong>.
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedOffer && offers && offers.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an offer above to start exploring negotiation scenarios.
          </CardContent>
        </Card>
      )}

      {(!offers || offers.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add job offers first to use scenario analysis.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
