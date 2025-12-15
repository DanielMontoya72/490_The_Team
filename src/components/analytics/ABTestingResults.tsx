import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FlaskConical, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface ABTest {
  name: string;
  variantA: { name: string; count: number; success: number; rate: number };
  variantB: { name: string; count: number; success: number; rate: number };
  winner: string | null;
  confidence: number;
  significant: boolean;
}

export function ABTestingResults() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["ab-testing-jobs"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", session.user.id)
        .neq("status", "Interested");
      
      if (error) throw error;
      return data || [];
    },
  });

  const successfulStatuses = ["Offer Received", "Accepted"];
  const interviewStatuses = ["Interview Scheduled", "Interviewing", "Offer Received", "Accepted"];

  // Calculate statistical significance using chi-square approximation
  const calculateConfidence = (a: { count: number; success: number }, b: { count: number; success: number }): { confidence: number; significant: boolean } => {
    if (a.count < 3 || b.count < 3) return { confidence: 0, significant: false };
    
    const rateA = a.success / a.count;
    const rateB = b.success / b.count;
    const pooledRate = (a.success + b.success) / (a.count + b.count);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/a.count + 1/b.count));
    
    if (se === 0) return { confidence: 0, significant: false };
    
    const z = Math.abs(rateA - rateB) / se;
    const confidence = Math.min(99, Math.round((1 - Math.exp(-z * z / 2)) * 100));
    
    return { confidence, significant: confidence >= 95 };
  };

  // Generate A/B tests from job data
  const generateABTests = (): ABTest[] => {
    const tests: ABTest[] = [];

    // Test 1: Application Source (LinkedIn vs Direct)
    const linkedinJobs = jobs.filter(j => j.job_url?.includes("linkedin"));
    const directJobs = jobs.filter(j => !j.job_url || (!j.job_url.includes("linkedin") && !j.job_url.includes("indeed")));
    
    if (linkedinJobs.length >= 3 && directJobs.length >= 3) {
      const linkedinSuccess = linkedinJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const directSuccess = directJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      const a = { count: linkedinJobs.length, success: linkedinSuccess };
      const b = { count: directJobs.length, success: directSuccess };
      const { confidence, significant } = calculateConfidence(a, b);
      
      const rateA = (linkedinSuccess / linkedinJobs.length) * 100;
      const rateB = (directSuccess / directJobs.length) * 100;
      
      tests.push({
        name: "Application Source",
        variantA: { name: "LinkedIn", count: linkedinJobs.length, success: linkedinSuccess, rate: rateA },
        variantB: { name: "Direct/Other", count: directJobs.length, success: directSuccess, rate: rateB },
        winner: significant ? (rateA > rateB ? "LinkedIn" : "Direct/Other") : null,
        confidence,
        significant,
      });
    }

    // Test 2: Company Size (Startup vs Enterprise)
    const startupJobs = jobs.filter(j => ["1-50", "51-200", "Startup", "Small"].includes(j.company_size || ""));
    const enterpriseJobs = jobs.filter(j => ["1000+", "5000+", "Enterprise", "Large"].includes(j.company_size || ""));
    
    if (startupJobs.length >= 3 && enterpriseJobs.length >= 3) {
      const startupSuccess = startupJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const enterpriseSuccess = enterpriseJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      const a = { count: startupJobs.length, success: startupSuccess };
      const b = { count: enterpriseJobs.length, success: enterpriseSuccess };
      const { confidence, significant } = calculateConfidence(a, b);
      
      const rateA = (startupSuccess / startupJobs.length) * 100;
      const rateB = (enterpriseSuccess / enterpriseJobs.length) * 100;
      
      tests.push({
        name: "Company Size Strategy",
        variantA: { name: "Startups", count: startupJobs.length, success: startupSuccess, rate: rateA },
        variantB: { name: "Enterprise", count: enterpriseJobs.length, success: enterpriseSuccess, rate: rateB },
        winner: significant ? (rateA > rateB ? "Startups" : "Enterprise") : null,
        confidence,
        significant,
      });
    }

    // Test 3: Job Type (Remote vs Onsite)
    const remoteJobs = jobs.filter(j => j.job_type?.toLowerCase().includes("remote"));
    const onsiteJobs = jobs.filter(j => j.job_type?.toLowerCase().includes("onsite") || j.job_type?.toLowerCase().includes("office"));
    
    if (remoteJobs.length >= 3 && onsiteJobs.length >= 3) {
      const remoteSuccess = remoteJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const onsiteSuccess = onsiteJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      const a = { count: remoteJobs.length, success: remoteSuccess };
      const b = { count: onsiteJobs.length, success: onsiteSuccess };
      const { confidence, significant } = calculateConfidence(a, b);
      
      const rateA = (remoteSuccess / remoteJobs.length) * 100;
      const rateB = (onsiteSuccess / onsiteJobs.length) * 100;
      
      tests.push({
        name: "Work Location Preference",
        variantA: { name: "Remote", count: remoteJobs.length, success: remoteSuccess, rate: rateA },
        variantB: { name: "Onsite", count: onsiteJobs.length, success: onsiteSuccess, rate: rateB },
        winner: significant ? (rateA > rateB ? "Remote" : "Onsite") : null,
        confidence,
        significant,
      });
    }

    // Test 4: Application Day (Weekday vs Weekend)
    const weekdayJobs = jobs.filter(j => {
      const day = new Date(j.created_at).getDay();
      return day >= 1 && day <= 5;
    });
    const weekendJobs = jobs.filter(j => {
      const day = new Date(j.created_at).getDay();
      return day === 0 || day === 6;
    });
    
    if (weekdayJobs.length >= 3 && weekendJobs.length >= 3) {
      const weekdaySuccess = weekdayJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const weekendSuccess = weekendJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      const a = { count: weekdayJobs.length, success: weekdaySuccess };
      const b = { count: weekendJobs.length, success: weekendSuccess };
      const { confidence, significant } = calculateConfidence(a, b);
      
      const rateA = (weekdaySuccess / weekdayJobs.length) * 100;
      const rateB = (weekendSuccess / weekendJobs.length) * 100;
      
      tests.push({
        name: "Application Timing",
        variantA: { name: "Weekdays", count: weekdayJobs.length, success: weekdaySuccess, rate: rateA },
        variantB: { name: "Weekends", count: weekendJobs.length, success: weekendSuccess, rate: rateB },
        winner: significant ? (rateA > rateB ? "Weekdays" : "Weekends") : null,
        confidence,
        significant,
      });
    }

    // Test 5: Notes Presence (Detailed vs Quick Apply)
    const detailedJobs = jobs.filter(j => j.notes && j.notes.length > 50);
    const quickJobs = jobs.filter(j => !j.notes || j.notes.length <= 50);
    
    if (detailedJobs.length >= 3 && quickJobs.length >= 3) {
      const detailedSuccess = detailedJobs.filter(j => interviewStatuses.includes(j.status)).length;
      const quickSuccess = quickJobs.filter(j => interviewStatuses.includes(j.status)).length;
      
      const a = { count: detailedJobs.length, success: detailedSuccess };
      const b = { count: quickJobs.length, success: quickSuccess };
      const { confidence, significant } = calculateConfidence(a, b);
      
      const rateA = (detailedSuccess / detailedJobs.length) * 100;
      const rateB = (quickSuccess / quickJobs.length) * 100;
      
      tests.push({
        name: "Application Effort",
        variantA: { name: "Detailed Research", count: detailedJobs.length, success: detailedSuccess, rate: rateA },
        variantB: { name: "Quick Apply", count: quickJobs.length, success: quickSuccess, rate: rateB },
        winner: significant ? (rateA > rateB ? "Detailed Research" : "Quick Apply") : null,
        confidence,
        significant,
      });
    }

    return tests;
  };

  const abTests = generateABTests();
  const significantTests = abTests.filter(t => t.significant);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{abTests.length}</div>
            <p className="text-xs text-muted-foreground">Strategy comparisons</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Significant Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{significantTests.length}</div>
            <p className="text-xs text-muted-foreground">95%+ confidence</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-xs text-muted-foreground">Applications analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* A/B Test Results */}
      {abTests.length > 0 ? (
        <div className="space-y-4">
          {abTests.map((test, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    {test.name}
                  </CardTitle>
                  {test.significant ? (
                    <Badge className="bg-green-500">Significant</Badge>
                  ) : (
                    <Badge variant="secondary">Needs More Data</Badge>
                  )}
                </div>
                <CardDescription>
                  Comparing {test.variantA.name} vs {test.variantB.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Variant A */}
                  <div className={`p-4 rounded-lg border ${test.winner === test.variantA.name ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{test.variantA.name}</span>
                      {test.winner === test.variantA.name && (
                        <Badge className="bg-green-500">Winner</Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold">{test.variantA.rate.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">
                      {test.variantA.success} of {test.variantA.count} interviews
                    </p>
                    <Progress value={test.variantA.rate} className="mt-2" />
                  </div>

                  {/* Variant B */}
                  <div className={`p-4 rounded-lg border ${test.winner === test.variantB.name ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{test.variantB.name}</span>
                      {test.winner === test.variantB.name && (
                        <Badge className="bg-green-500">Winner</Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold">{test.variantB.rate.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">
                      {test.variantB.success} of {test.variantB.count} interviews
                    </p>
                    <Progress value={test.variantB.rate} className="mt-2" />
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Statistical Confidence</span>
                    <span className="text-sm font-medium">{test.confidence}%</span>
                  </div>
                  <Progress 
                    value={test.confidence} 
                    className={`h-2 ${test.significant ? '[&>div]:bg-green-500' : ''}`}
                  />
                  {!test.significant && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Need more data for statistically significant results (95%+ confidence)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Not enough data for A/B testing yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Apply to more jobs with varied strategies to generate comparison data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
