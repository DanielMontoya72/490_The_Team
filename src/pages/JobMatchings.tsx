import { AppNav } from "@/components/layout/AppNav";
import { JobMatchComparison } from "@/components/jobs/JobMatchComparison";
import { MatchingPreferences } from "@/components/jobs/MatchingPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Settings } from "lucide-react";

export default function JobMatchings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Job Matching</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            See how well you match different opportunities and optimize your profile
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <JobMatchComparison />
            
            <Card>
              <CardHeader>
                <CardTitle>How Match Scoring Works</CardTitle>
                <CardDescription>
                  Understanding your job match scores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Excellent Match (80-100%)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    You're highly qualified for this role. Your skills, experience, and education align exceptionally well with the job requirements.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Good Match (60-79%)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    You meet most of the requirements and have a strong chance. Minor improvements could boost your candidacy.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    Fair Match (40-59%)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    You have some relevant qualifications but there are notable gaps. Consider strengthening your profile in key areas.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Weak Match (&lt;40%)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Significant gaps exist between your qualifications and job requirements. This may not be the best fit right now.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <MatchingPreferences />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tips for Better Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 rounded-lg border">
                  <p className="font-medium mb-1">Keep Your Profile Updated</p>
                  <p className="text-muted-foreground text-xs">
                    Add new skills, certifications, and experiences as you acquire them
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border">
                  <p className="font-medium mb-1">Add Detailed Descriptions</p>
                  <p className="text-muted-foreground text-xs">
                    Provide comprehensive job descriptions and project details
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border">
                  <p className="font-medium mb-1">Follow Suggestions</p>
                  <p className="text-muted-foreground text-xs">
                    Act on improvement suggestions to increase your scores
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border">
                  <p className="font-medium mb-1">Refresh Regularly</p>
                  <p className="text-muted-foreground text-xs">
                    Recalculate matches after updating your profile
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
