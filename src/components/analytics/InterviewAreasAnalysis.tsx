import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InterviewAreasAnalysisProps {
  data: any;
}

const areaDescriptions: Record<string, string> = {
  preparation: "Based on completed preparation tasks and checklist items",
  roleMatch: "Complete Job Match analysis to see your fit score",
  companyResearch: "Research the company profile, news, and leadership",
  practiceHours: "Complete mock interviews to log practice hours",
};

const areaActions: Record<string, string> = {
  preparation: "Complete preparation tasks on interview page",
  roleMatch: "Go to Jobs → Details → Calculate Job Match",
  companyResearch: "Go to Jobs → Company tab → Generate Research",
  practiceHours: "Go to Jobs → Interviews → Start Mock Interview",
};

export function InterviewAreasAnalysis({ data }: InterviewAreasAnalysisProps) {
  const predictions = data?.predictions || [];
  const interviews = data?.interviews || [];
  const interviewsWithoutPredictions = interviews.filter((i: any) => 
    !predictions.some((p: any) => p.interview_id === i.id)
  );
  
  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Areas Analysis
          </CardTitle>
          <CardDescription>
            Identify your strongest and weakest interview areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {interviewsWithoutPredictions.length > 0 
              ? `You have ${interviewsWithoutPredictions.length} interview${interviewsWithoutPredictions.length > 1 ? 's' : ''} without predictions. Generate predictions to see analysis of your strengths and weaknesses.`
              : 'Complete some interviews with predictions to see your strengths and weaknesses'
            }
          </p>
          {interviewsWithoutPredictions.length > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Go to Jobs → Interviews → Click on an interview → Calculate Success Prediction
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Calculate average scores across all predictions
  const avgScores = {
    preparation: predictions.reduce((sum: number, p: any) => sum + (p.preparation_score || 0), 0) / predictions.length,
    roleMatch: predictions.reduce((sum: number, p: any) => sum + (p.role_match_score || 0), 0) / predictions.length,
    companyResearch: predictions.reduce((sum: number, p: any) => sum + (p.company_research_score || 0), 0) / predictions.length,
    practiceHours: predictions.reduce((sum: number, p: any) => sum + (p.practice_hours_score || 0), 0) / predictions.length,
  };
  
  const areas = [
    { name: 'Interview Preparation', score: avgScores.preparation, category: 'preparation' },
    { name: 'Role Match', score: avgScores.roleMatch, category: 'roleMatch' },
    { name: 'Company Research', score: avgScores.companyResearch, category: 'companyResearch' },
    { name: 'Practice Hours', score: avgScores.practiceHours, category: 'practiceHours' },
  ].sort((a, b) => b.score - a.score);
  
  const strongest = areas[0];
  const weakest = areas[areas.length - 1];
  
  // Check if all non-preparation scores are 0
  const hasLowScores = avgScores.roleMatch === 0 || avgScores.companyResearch === 0 || avgScores.practiceHours === 0;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Interview Areas Analysis
          </CardTitle>
          <CardDescription>
            Identify your strongest and weakest interview areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Strongest Area
              </div>
              <div className="text-2xl font-bold">{strongest.name}</div>
              <div className="text-sm text-muted-foreground">
                {strongest.score.toFixed(1)}% average score
              </div>
            </div>
            
            <div className="space-y-2 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-500 font-semibold">
                <TrendingDown className="h-4 w-4" />
                Needs Improvement
              </div>
              <div className="text-2xl font-bold">{weakest.name}</div>
              <div className="text-sm text-muted-foreground">
                {weakest.score.toFixed(1)}% average score
              </div>
              {weakest.score === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {areaActions[weakest.category]}
                </p>
              )}
            </div>
          </div>
          
          {hasLowScores && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                <strong>💡 Tip:</strong> Complete more preparation activities to improve your scores. 
                Hover over area names for guidance on how to boost each score.
              </p>
            </div>
          )}
          
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-sm">All Areas</h4>
            {areas.map((area) => (
              <div key={area.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium flex items-center gap-1 cursor-help">
                        {area.name}
                        {area.score === 0 && <Info className="h-3 w-3 text-muted-foreground" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">{areaDescriptions[area.category]}</p>
                      {area.score === 0 && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          {areaActions[area.category]}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                  <span className={area.score === 0 ? "text-muted-foreground" : ""}>
                    {area.score.toFixed(1)}%
                  </span>
                </div>
                <Progress value={area.score} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
