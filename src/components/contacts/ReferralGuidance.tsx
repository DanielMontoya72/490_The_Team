import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Clock, MessageSquare, UserCheck, Heart, Target } from "lucide-react";

export function ReferralGuidance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Referral Etiquette & Best Practices
        </CardTitle>
        <CardDescription>
          Follow these guidelines to maximize your referral success while maintaining strong relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Optimal Timing:</strong> Wait at least 3-6 months between referral requests to the same person. 
            Ask during active hiring periods for best results.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex gap-3">
            <UserCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Build the Relationship First</h4>
              <p className="text-sm text-muted-foreground">
                Only ask for referrals from contacts you've built genuine relationships with. 
                Catch up first, then mention your job search naturally.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Make It Easy for Them</h4>
              <p className="text-sm text-muted-foreground">
                Provide your resume, a brief summary of your qualifications, and explain why you're a good fit. 
                Draft a template they can forward directly.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Be Specific & Realistic</h4>
              <p className="text-sm text-muted-foreground">
                Clearly state the role, company, and why you're interested. Don't ask for referrals 
                to positions you're not qualified for.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Express Gratitude & Keep Them Updated</h4>
              <p className="text-sm text-muted-foreground">
                Thank them immediately, whether they can help or not. Update them on the outcome 
                and look for ways to reciprocate their support.
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-muted">
          <AlertDescription>
            <strong>Reciprocity Tip:</strong> Track who helps you and actively look for opportunities 
            to return the favor. Maintaining balanced relationships leads to stronger networks.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
