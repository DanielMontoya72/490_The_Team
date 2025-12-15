import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface FeedbackThemesTrackerProps {
  data: any;
}

export function FeedbackThemesTracker({ data }: FeedbackThemesTrackerProps) {
  const predictions = data?.predictions || [];
  const mockSessions = data?.mockSessions || [];
  const interviews = data?.interviews || [];
  const interviewsWithoutPredictions = interviews.filter((i: any) => 
    !predictions.some((p: any) => p.interview_id === i.id)
  );
  
  // Extract feedback themes from predictions
  const strengthThemes: Record<string, number> = {};
  const weaknessThemes: Record<string, number> = {};
  
  predictions.forEach((p: any) => {
    // Process strength areas
    const strengths = p.strength_areas || [];
    strengths.forEach((s: string) => {
      const normalized = s.toLowerCase().trim();
      strengthThemes[normalized] = (strengthThemes[normalized] || 0) + 1;
    });
    
    // Process weakness areas
    const weaknesses = p.weakness_areas || [];
    weaknesses.forEach((w: string) => {
      const normalized = w.toLowerCase().trim();
      weaknessThemes[normalized] = (weaknessThemes[normalized] || 0) + 1;
    });
  });
  
  // Also extract from mock sessions
  mockSessions.forEach((session: any) => {
    const feedback = session.feedback || {};
    
    // Extract strengths from feedback
    if (feedback.strengths) {
      (Array.isArray(feedback.strengths) ? feedback.strengths : [feedback.strengths]).forEach((s: string) => {
        if (s) {
          const normalized = s.toLowerCase().trim();
          strengthThemes[normalized] = (strengthThemes[normalized] || 0) + 1;
        }
      });
    }
    
    // Extract improvements from feedback
    if (feedback.improvements) {
      (Array.isArray(feedback.improvements) ? feedback.improvements : [feedback.improvements]).forEach((w: string) => {
        if (w) {
          const normalized = w.toLowerCase().trim();
          weaknessThemes[normalized] = (weaknessThemes[normalized] || 0) + 1;
        }
      });
    }
  });
  
  // Sort by frequency
  const topStrengths = Object.entries(strengthThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const topWeaknesses = Object.entries(weaknessThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const totalFeedback = predictions.length + mockSessions.length;
  
  if (totalFeedback === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Themes Analysis
          </CardTitle>
          <CardDescription>
            Track common improvement areas and recurring feedback patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              {interviewsWithoutPredictions.length > 0 
                ? `You have ${interviewsWithoutPredictions.length} interview${interviewsWithoutPredictions.length > 1 ? 's' : ''} without predictions. Generate predictions to see feedback themes and patterns.`
                : 'Complete interviews and practice sessions to see feedback themes'
              }
            </p>
          </div>
          {interviewsWithoutPredictions.length > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Go to Jobs → Interviews → Prediction Accuracy tab → Click "Generate Prediction" for your interviews
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback Themes Analysis
        </CardTitle>
        <CardDescription>
          Common patterns identified across {totalFeedback} interviews and practice sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strength Themes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h4 className="font-semibold text-sm">Recurring Strengths</h4>
          </div>
          {topStrengths.length > 0 ? (
            <div className="space-y-3">
              {topStrengths.map(([theme, count], index) => {
                const percentage = (count / totalFeedback) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm capitalize truncate max-w-[200px]">{theme}</span>
                      <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">
                        {count}x mentioned
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-1.5 bg-green-500/20" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No strength patterns identified yet</p>
          )}
        </div>
        
        {/* Weakness Themes */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            <h4 className="font-semibold text-sm">Common Improvement Areas</h4>
          </div>
          {topWeaknesses.length > 0 ? (
            <div className="space-y-3">
              {topWeaknesses.map(([theme, count], index) => {
                const percentage = (count / totalFeedback) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm capitalize truncate max-w-[200px]">{theme}</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-600/30 bg-orange-500/10">
                        {count}x mentioned
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-1.5 bg-orange-500/20" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No improvement areas identified yet</p>
          )}
        </div>
        
        {/* Key Insight */}
        {topWeaknesses.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              <span className="font-semibold">Focus Area: </span>
              <span className="capitalize">{topWeaknesses[0][0]}</span> appears most frequently. 
              Consider dedicating extra practice to this area before your next interview.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
