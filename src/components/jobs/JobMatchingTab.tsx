import { JobMatchComparison } from "@/components/jobs/JobMatchComparison";
import { MatchingPreferences } from "@/components/jobs/MatchingPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function JobMatchingTab() {
  return (
    <div className="space-y-6">
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
                <p className="font-medium mb-1">Include Keywords</p>
                <p className="text-muted-foreground text-xs">
                  Use industry-standard terms that appear in job postings
                </p>
              </div>
              
              <div className="p-3 rounded-lg border">
                <p className="font-medium mb-1">Quantify Achievements</p>
                <p className="text-muted-foreground text-xs">
                  Numbers and metrics help demonstrate your impact
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
