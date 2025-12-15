import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditOfferDialogProps {
  offer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COL_INDEX: Record<string, number> = {
  'San Francisco': 180, 'New York': 170, 'Seattle': 150, 'Boston': 145,
  'Los Angeles': 140, 'Washington DC': 135, 'Denver': 115, 'Austin': 110,
  'Chicago': 105, 'Atlanta': 100, 'Dallas': 95, 'Phoenix': 95, 'Remote': 100,
};

export function EditOfferDialog({ offer, open, onOpenChange }: EditOfferDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  
  const [companyName, setCompanyName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remotePolicy, setRemotePolicy] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [signingBonus, setSigningBonus] = useState("");
  const [annualBonusPercent, setAnnualBonusPercent] = useState("");
  const [equityValue, setEquityValue] = useState("");
  const [equityVestingYears, setEquityVestingYears] = useState("4");
  const [healthInsuranceValue, setHealthInsuranceValue] = useState("");
  const [retirementMatchPercent, setRetirementMatchPercent] = useState("");
  const [retirementMaxMatch, setRetirementMaxMatch] = useState("");
  const [ptoDays, setPtoDays] = useState("");
  const [otherBenefitsValue, setOtherBenefitsValue] = useState("");
  const [benefitsNotes, setBenefitsNotes] = useState("");
  const [cultureFitScore, setCultureFitScore] = useState("");
  const [growthOpportunityScore, setGrowthOpportunityScore] = useState("");
  const [workLifeBalanceScore, setWorkLifeBalanceScore] = useState("");
  const [jobSecurityScore, setJobSecurityScore] = useState("");
  const [commuteScore, setCommuteScore] = useState("");
  const [status, setStatus] = useState("active");
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (offer) {
      setCompanyName(offer.company_name || "");
      setPositionTitle(offer.position_title || "");
      setLocation(offer.location || "");
      setRemotePolicy(offer.remote_policy || "");
      setOfferDate(offer.offer_date || "");
      setExpirationDate(offer.expiration_date || "");
      setBaseSalary(offer.base_salary?.toString() || "");
      setSigningBonus(offer.signing_bonus?.toString() || "");
      setAnnualBonusPercent(offer.annual_bonus_percent?.toString() || "");
      setEquityValue(offer.equity_value?.toString() || "");
      setEquityVestingYears(offer.equity_vesting_years?.toString() || "4");
      setHealthInsuranceValue(offer.health_insurance_value?.toString() || "");
      setRetirementMatchPercent(offer.retirement_match_percent?.toString() || "");
      setRetirementMaxMatch(offer.retirement_max_match?.toString() || "");
      setPtoDays(offer.pto_days?.toString() || "");
      setOtherBenefitsValue(offer.other_benefits_value?.toString() || "");
      setBenefitsNotes(offer.benefits_notes || "");
      setCultureFitScore(offer.culture_fit_score?.toString() || "");
      setGrowthOpportunityScore(offer.growth_opportunity_score?.toString() || "");
      setWorkLifeBalanceScore(offer.work_life_balance_score?.toString() || "");
      setJobSecurityScore(offer.job_security_score?.toString() || "");
      setCommuteScore(offer.commute_score?.toString() || "");
      setStatus(offer.status || "active");
      setDeclineReason(offer.decline_reason || "");
    }
  }, [offer]);

  const calculateTotalCompensation = () => {
    const base = parseFloat(baseSalary) || 0;
    const signing = parseFloat(signingBonus) || 0;
    const bonusPercent = parseFloat(annualBonusPercent) || 0;
    const equity = parseFloat(equityValue) || 0;
    const vestingYears = parseInt(equityVestingYears) || 4;
    const healthValue = parseFloat(healthInsuranceValue) || 0;
    const retireMatch = parseFloat(retirementMatchPercent) || 0;
    const retireMax = parseFloat(retirementMaxMatch) || 0;
    const otherBenefits = parseFloat(otherBenefitsValue) || 0;
    const pto = parseInt(ptoDays) || 0;

    const annualBonus = base * (bonusPercent / 100);
    const annualEquity = equity / vestingYears;
    const retirementContribution = Math.min(base * (retireMatch / 100), retireMax);
    const ptoValue = (base / 260) * pto;

    return base + annualBonus + annualEquity + healthValue + retirementContribution + ptoValue + otherBenefits + (signing / 4);
  };

  const getCostOfLivingIndex = () => {
    if (remotePolicy === 'remote') return 100;
    for (const [city, index] of Object.entries(COL_INDEX)) {
      if (location.toLowerCase().includes(city.toLowerCase())) return index;
    }
    return 100;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const totalComp = calculateTotalCompensation();
      const colIndex = getCostOfLivingIndex();
      const adjustedComp = (totalComp / colIndex) * 100;

      const scores = [
        parseInt(cultureFitScore) || 0, parseInt(growthOpportunityScore) || 0,
        parseInt(workLifeBalanceScore) || 0, parseInt(jobSecurityScore) || 0, parseInt(commuteScore) || 0,
      ];
      const avgScore = scores.filter(s => s > 0).reduce((a, b) => a + b, 0) / Math.max(scores.filter(s => s > 0).length, 1);

      const { error } = await supabase.from('job_offers').update({
        company_name: companyName,
        position_title: positionTitle,
        location,
        remote_policy: remotePolicy || null,
        offer_date: offerDate || null,
        expiration_date: expirationDate || null,
        base_salary: parseFloat(baseSalary) || 0,
        signing_bonus: parseFloat(signingBonus) || 0,
        annual_bonus_percent: parseFloat(annualBonusPercent) || 0,
        equity_value: parseFloat(equityValue) || 0,
        equity_vesting_years: parseInt(equityVestingYears) || 4,
        health_insurance_value: parseFloat(healthInsuranceValue) || 0,
        retirement_match_percent: parseFloat(retirementMatchPercent) || 0,
        retirement_max_match: parseFloat(retirementMaxMatch) || 0,
        pto_days: parseInt(ptoDays) || 0,
        other_benefits_value: parseFloat(otherBenefitsValue) || 0,
        benefits_notes: benefitsNotes || null,
        culture_fit_score: parseInt(cultureFitScore) || null,
        growth_opportunity_score: parseInt(growthOpportunityScore) || null,
        work_life_balance_score: parseInt(workLifeBalanceScore) || null,
        job_security_score: parseInt(jobSecurityScore) || null,
        commute_score: parseInt(commuteScore) || null,
        total_compensation: totalComp,
        adjusted_compensation: adjustedComp,
        cost_of_living_index: colIndex,
        weighted_score: avgScore,
        status,
        decline_reason: status === 'declined' ? declineReason : null,
        decision_date: ['accepted', 'declined'].includes(status) ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', offer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      toast.success('Offer updated');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update offer'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job Offer</DialogTitle>
          <DialogDescription>Update offer details</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="compensation">Comp</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Position Title *</Label>
                <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Remote Policy</Label>
                <Select value={remotePolicy} onValueChange={setRemotePolicy}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Fully Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Salary *</Label>
                <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Signing Bonus</Label>
                <Input type="number" value={signingBonus} onChange={(e) => setSigningBonus(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Bonus (%)</Label>
                <Input type="number" value={annualBonusPercent} onChange={(e) => setAnnualBonusPercent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Equity Value</Label>
                <Input type="number" value={equityValue} onChange={(e) => setEquityValue(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Health Insurance Value</Label>
                <Input type="number" value={healthInsuranceValue} onChange={(e) => setHealthInsuranceValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PTO Days</Label>
                <Input type="number" value={ptoDays} onChange={(e) => setPtoDays(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>401k Match (%)</Label>
                <Input type="number" value={retirementMatchPercent} onChange={(e) => setRetirementMatchPercent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>401k Max Match</Label>
                <Input type="number" value={retirementMaxMatch} onChange={(e) => setRetirementMaxMatch(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scores" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Culture Fit (1-10)</Label>
                <Input type="number" min="1" max="10" value={cultureFitScore} onChange={(e) => setCultureFitScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Growth Opportunities (1-10)</Label>
                <Input type="number" min="1" max="10" value={growthOpportunityScore} onChange={(e) => setGrowthOpportunityScore(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work-Life Balance (1-10)</Label>
                <Input type="number" min="1" max="10" value={workLifeBalanceScore} onChange={(e) => setWorkLifeBalanceScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Job Security (1-10)</Label>
                <Input type="number" min="1" max="10" value={jobSecurityScore} onChange={(e) => setJobSecurityScore(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'declined' && (
              <div className="space-y-2">
                <Label>Decline Reason</Label>
                <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Why did you decline this offer?" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={!companyName || !positionTitle || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
