import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cost of living index by major cities (US avg = 100)
const COL_INDEX: Record<string, number> = {
  'San Francisco': 180,
  'New York': 170,
  'Seattle': 150,
  'Boston': 145,
  'Los Angeles': 140,
  'Washington DC': 135,
  'Denver': 115,
  'Austin': 110,
  'Chicago': 105,
  'Atlanta': 100,
  'Dallas': 95,
  'Phoenix': 95,
  'Remote': 100,
};

export function AddOfferDialog({ open, onOpenChange }: AddOfferDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  
  // Link to existing job
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  
  // Basic info
  const [companyName, setCompanyName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remotePolicy, setRemotePolicy] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  // Compensation
  const [baseSalary, setBaseSalary] = useState("");
  const [signingBonus, setSigningBonus] = useState("");
  const [annualBonusPercent, setAnnualBonusPercent] = useState("");
  const [equityValue, setEquityValue] = useState("");
  const [equityVestingYears, setEquityVestingYears] = useState("4");

  // Benefits
  const [healthInsuranceValue, setHealthInsuranceValue] = useState("");
  const [retirementMatchPercent, setRetirementMatchPercent] = useState("");
  const [retirementMaxMatch, setRetirementMaxMatch] = useState("");
  const [ptoDays, setPtoDays] = useState("");
  const [otherBenefitsValue, setOtherBenefitsValue] = useState("");
  const [benefitsNotes, setBenefitsNotes] = useState("");

  // Non-financial scores
  const [cultureFitScore, setCultureFitScore] = useState("");
  const [growthOpportunityScore, setGrowthOpportunityScore] = useState("");
  const [workLifeBalanceScore, setWorkLifeBalanceScore] = useState("");
  const [jobSecurityScore, setJobSecurityScore] = useState("");
  const [commuteScore, setCommuteScore] = useState("");

  // Fetch jobs to link
  const { data: availableJobs } = useQuery({
    queryKey: ['jobs-for-offer-link'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, location, salary_range_min, salary_range_max')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      return data || [];
    },
    enabled: open,
  });

  // Auto-fill from selected job
  useEffect(() => {
    if (selectedJobId && availableJobs) {
      const job = availableJobs.find(j => j.id === selectedJobId);
      if (job) {
        setCompanyName(job.company_name);
        setPositionTitle(job.job_title);
        setLocation(job.location || "");
        if (job.salary_range_max) {
          setBaseSalary(job.salary_range_max.toString());
        } else if (job.salary_range_min) {
          setBaseSalary(job.salary_range_min.toString());
        }
      }
    }
  }, [selectedJobId, availableJobs]);

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
    const ptoValue = (base / 260) * pto; // Daily rate * PTO days

    return base + annualBonus + annualEquity + healthValue + retirementContribution + ptoValue + otherBenefits + (signing / 4); // Amortize signing over 4 years
  };

  const getCostOfLivingIndex = () => {
    if (remotePolicy === 'remote') return 100;
    for (const [city, index] of Object.entries(COL_INDEX)) {
      if (location.toLowerCase().includes(city.toLowerCase())) {
        return index;
      }
    }
    return 100;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalComp = calculateTotalCompensation();
      const colIndex = getCostOfLivingIndex();
      const adjustedComp = (totalComp / colIndex) * 100;

      // Calculate weighted score
      const scores = [
        parseInt(cultureFitScore) || 0,
        parseInt(growthOpportunityScore) || 0,
        parseInt(workLifeBalanceScore) || 0,
        parseInt(jobSecurityScore) || 0,
        parseInt(commuteScore) || 0,
      ];
      const avgScore = scores.filter(s => s > 0).reduce((a, b) => a + b, 0) / Math.max(scores.filter(s => s > 0).length, 1);

      const { error } = await supabase.from('job_offers').insert({
        user_id: user.id,
        job_id: selectedJobId || null,
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
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offered-jobs-unlinked'] });
      toast.success('Offer added successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add offer'),
  });

  const resetForm = () => {
    setSelectedJobId("");
    setCompanyName("");
    setPositionTitle("");
    setLocation("");
    setRemotePolicy("");
    setOfferDate("");
    setExpirationDate("");
    setBaseSalary("");
    setSigningBonus("");
    setAnnualBonusPercent("");
    setEquityValue("");
    setEquityVestingYears("4");
    setHealthInsuranceValue("");
    setRetirementMatchPercent("");
    setRetirementMaxMatch("");
    setPtoDays("");
    setOtherBenefitsValue("");
    setBenefitsNotes("");
    setCultureFitScore("");
    setGrowthOpportunityScore("");
    setWorkLifeBalanceScore("");
    setJobSecurityScore("");
    setCommuteScore("");
    setActiveTab("basic");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Job Offer</DialogTitle>
          <DialogDescription>Enter all offer details for comparison</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="scores">Scores</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {availableJobs && availableJobs.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Existing Job (Optional)</Label>
                <Select value={selectedJobId || "none"} onValueChange={(val) => setSelectedJobId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Enter manually</SelectItem>
                    {availableJobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} at {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Google" />
              </div>
              <div className="space-y-2">
                <Label>Position Title *</Label>
                <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="e.g., Senior Engineer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., San Francisco, CA" />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Offer Date</Label>
                <Input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Salary *</Label>
                <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="150000" />
              </div>
              <div className="space-y-2">
                <Label>Signing Bonus</Label>
                <Input type="number" value={signingBonus} onChange={(e) => setSigningBonus(e.target.value)} placeholder="25000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Bonus (%)</Label>
                <Input type="number" value={annualBonusPercent} onChange={(e) => setAnnualBonusPercent(e.target.value)} placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label>Equity Value (total)</Label>
                <Input type="number" value={equityValue} onChange={(e) => setEquityValue(e.target.value)} placeholder="100000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Equity Vesting Period (years)</Label>
              <Select value={equityVestingYears} onValueChange={setEquityVestingYears}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 years</SelectItem>
                  <SelectItem value="4">4 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Health Insurance Value (annual)</Label>
                <Input type="number" value={healthInsuranceValue} onChange={(e) => setHealthInsuranceValue(e.target.value)} placeholder="12000" />
              </div>
              <div className="space-y-2">
                <Label>PTO Days</Label>
                <Input type="number" value={ptoDays} onChange={(e) => setPtoDays(e.target.value)} placeholder="20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>401k Match (%)</Label>
                <Input type="number" value={retirementMatchPercent} onChange={(e) => setRetirementMatchPercent(e.target.value)} placeholder="6" />
              </div>
              <div className="space-y-2">
                <Label>401k Max Match ($)</Label>
                <Input type="number" value={retirementMaxMatch} onChange={(e) => setRetirementMaxMatch(e.target.value)} placeholder="9000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Other Benefits Value (annual)</Label>
              <Input type="number" value={otherBenefitsValue} onChange={(e) => setOtherBenefitsValue(e.target.value)} placeholder="2000" />
            </div>
            <div className="space-y-2">
              <Label>Benefits Notes</Label>
              <Textarea value={benefitsNotes} onChange={(e) => setBenefitsNotes(e.target.value)} placeholder="e.g., Free meals, gym, commuter benefits..." />
            </div>
          </TabsContent>

          <TabsContent value="scores" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">Rate each factor from 1-10 (10 being best)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Culture Fit</Label>
                <Input type="number" min="1" max="10" value={cultureFitScore} onChange={(e) => setCultureFitScore(e.target.value)} placeholder="1-10" />
              </div>
              <div className="space-y-2">
                <Label>Growth Opportunities</Label>
                <Input type="number" min="1" max="10" value={growthOpportunityScore} onChange={(e) => setGrowthOpportunityScore(e.target.value)} placeholder="1-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work-Life Balance</Label>
                <Input type="number" min="1" max="10" value={workLifeBalanceScore} onChange={(e) => setWorkLifeBalanceScore(e.target.value)} placeholder="1-10" />
              </div>
              <div className="space-y-2">
                <Label>Job Security</Label>
                <Input type="number" min="1" max="10" value={jobSecurityScore} onChange={(e) => setJobSecurityScore(e.target.value)} placeholder="1-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Commute Score</Label>
              <Input type="number" min="1" max="10" value={commuteScore} onChange={(e) => setCommuteScore(e.target.value)} placeholder="1-10" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => addMutation.mutate()} 
            disabled={!companyName || !positionTitle || !baseSalary || addMutation.isPending}
          >
            {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
