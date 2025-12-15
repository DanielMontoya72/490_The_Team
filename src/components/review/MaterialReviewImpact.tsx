import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, FileText, CheckCircle2, XCircle, BarChart3, Target, Lightbulb } from "lucide-react";

export function MaterialReviewImpact() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch review impact data
  const { data: impactData, isLoading } = useQuery({
    queryKey: ["material-review-impact"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;

      // Fetch review impact records
      const { data: impacts, error: impactsError } = await (supabase as any)
        .from("material_review_impact")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (impactsError) throw impactsError;

      // Fetch jobs for correlation
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, job_title, company_name, status")
        .eq("user_id", session.user.id);

      if (jobsError) throw jobsError;

      // Fetch resume feedback
      const { data: resumeFeedback } = await (supabase as any)
        .from("resume_feedback")
        .select("*, resume_shares!inner(user_id)")
        .eq("resume_shares.user_id", session.user.id);

      // Fetch cover letter feedback
      const { data: coverLetterFeedback } = await (supabase as any)
        .from("cover_letter_feedback")
        .select("*, cover_letter_shares!inner(user_id)")
        .eq("cover_letter_shares.user_id", session.user.id);

      return {
        impacts: impacts || [],
        jobs: jobs || [],
        resumeFeedback: resumeFeedback || [],
        coverLetterFeedback: coverLetterFeedback || [],
      };
    },
  });

  // Calculate metrics
  const calculateMetrics = () => {
    if (!impactData) return null;

    const { impacts, jobs, resumeFeedback, coverLetterFeedback } = impactData;

    // Total applications
    const totalApplications = jobs.length;
    const successfulApplications = jobs.filter(j => 
      ["Interview", "Offer Received", "Accepted"].includes(j.status)
    ).length;

    // Reviewed vs non-reviewed success rates
    const reviewedMaterials = impacts.filter(i => i.was_reviewed);
    const nonReviewedMaterials = impacts.filter(i => !i.was_reviewed);

    const reviewedSuccess = reviewedMaterials.filter(i => 
      ["interview", "offer", "accepted"].includes(i.application_outcome?.toLowerCase() || "")
    ).length;
    
    const nonReviewedSuccess = nonReviewedMaterials.filter(i => 
      ["interview", "offer", "accepted"].includes(i.application_outcome?.toLowerCase() || "")
    ).length;

    const reviewedSuccessRate = reviewedMaterials.length > 0 
      ? (reviewedSuccess / reviewedMaterials.length) * 100 
      : 0;
    
    const nonReviewedSuccessRate = nonReviewedMaterials.length > 0 
      ? (nonReviewedSuccess / nonReviewedMaterials.length) * 100 
      : 0;

    // Feedback implementation correlation
    const implementedFeedback = [...resumeFeedback, ...coverLetterFeedback]
      .filter(f => f.status === "resolved");

    const avgFeedbackPerApplication = totalApplications > 0 
      ? implementedFeedback.length / totalApplications 
      : 0;

    return {
      totalApplications,
      successfulApplications,
      overallSuccessRate: totalApplications > 0 ? (successfulApplications / totalApplications) * 100 : 0,
      reviewedCount: reviewedMaterials.length,
      nonReviewedCount: nonReviewedMaterials.length,
      reviewedSuccessRate,
      nonReviewedSuccessRate,
      totalFeedback: resumeFeedback.length + coverLetterFeedback.length,
      implementedFeedback: implementedFeedback.length,
      avgFeedbackPerApplication,
      reviewImpact: reviewedSuccessRate - nonReviewedSuccessRate,
    };
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading review impact data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metrics?.totalApplications || 0}</p>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{metrics?.reviewedCount || 0}</p>
                <p className="text-xs text-muted-foreground">Reviewed Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{metrics?.implementedFeedback || 0}</p>
                <p className="text-xs text-muted-foreground">Feedback Implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-5 w-5 ${(metrics?.reviewImpact || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-2xl font-bold">
                  {(metrics?.reviewImpact || 0) >= 0 ? '+' : ''}{(metrics?.reviewImpact || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Review Impact</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Success Rate Analysis
              </CardTitle>
              <CardDescription>
                Compare success rates between reviewed and non-reviewed application materials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Success Rate</span>
                  <span className="font-medium">{(metrics?.overallSuccessRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={metrics?.overallSuccessRate || 0} className="h-3" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    With Review ({metrics?.reviewedCount || 0} applications)
                  </span>
                  <span className="font-medium text-green-600">{(metrics?.reviewedSuccessRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={metrics?.reviewedSuccessRate || 0} className="h-3 bg-green-100" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-gray-400" />
                    Without Review ({metrics?.nonReviewedCount || 0} applications)
                  </span>
                  <span className="font-medium text-gray-600">{(metrics?.nonReviewedSuccessRate || 0).toFixed(1)}%</span>
                </div>
                <Progress value={metrics?.nonReviewedSuccessRate || 0} className="h-3 bg-gray-100" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Type Comparison</CardTitle>
              <CardDescription>
                Review impact broken down by resume vs cover letter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Resumes</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Feedback</span>
                      <Badge variant="outline">{impactData?.resumeFeedback?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Implemented</span>
                      <Badge variant="default">
                        {impactData?.resumeFeedback?.filter((f: any) => f.status === "resolved").length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Cover Letters</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Feedback</span>
                      <Badge variant="outline">{impactData?.coverLetterFeedback?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Implemented</span>
                      <Badge variant="default">
                        {impactData?.coverLetterFeedback?.filter((f: any) => f.status === "resolved").length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(metrics?.reviewImpact || 0) > 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-800">Positive Review Impact</p>
                  <p className="text-sm text-green-700">
                    Applications with reviewed materials have a {(metrics?.reviewImpact || 0).toFixed(1)}% higher 
                    success rate. Keep getting feedback on your materials!
                  </p>
                </div>
              ) : (metrics?.reviewImpact || 0) < 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800">Room for Improvement</p>
                  <p className="text-sm text-yellow-700">
                    Consider implementing more of the feedback you receive. Focus on 
                    actionable suggestions that align with job requirements.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-800">Start Tracking</p>
                  <p className="text-sm text-blue-700">
                    Share your materials for review to start tracking the impact 
                    on your application success rate.
                  </p>
                </div>
              )}

              <div className="p-4 border rounded-lg">
                <p className="font-medium mb-2">Recommendations</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    Get at least 2-3 reviews before submitting important applications
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    Prioritize feedback from industry professionals
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    Implement feedback before the review deadline
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    Track which types of feedback lead to interviews
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
