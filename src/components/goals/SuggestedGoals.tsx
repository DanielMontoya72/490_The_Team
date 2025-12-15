import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus } from "lucide-react";

interface SuggestedGoal {
  title: string;
  description: string;
  category: string;
  type: string;
  priority: string;
  metric: string;
}

interface SuggestedGoalsProps {
  onSelectGoal: (goal: SuggestedGoal) => void;
}

const suggestedGoals: SuggestedGoal[] = [
  {
    title: "Land a Job Offer",
    description: "Secure at least one job offer in your target industry",
    category: "job_search",
    type: "short_term",
    priority: "high",
    metric: "Receive 1 job offer within 3 months"
  },
  {
    title: "Submit 50 Quality Applications",
    description: "Apply to 50 relevant positions with tailored resumes and cover letters",
    category: "job_search",
    type: "short_term",
    priority: "high",
    metric: "Submit 50 applications within 6 weeks"
  },
  {
    title: "Build Professional Network",
    description: "Connect with professionals in your target industry through LinkedIn and networking events",
    category: "networking",
    type: "short_term",
    priority: "medium",
    metric: "Add 30 meaningful connections and attend 3 networking events"
  },
  {
    title: "Complete Technical Certification",
    description: "Earn a professional certification relevant to your career goals",
    category: "skill_development",
    type: "long_term",
    priority: "medium",
    metric: "Complete 1 industry-recognized certification"
  },
  {
    title: "Conduct 20 Informational Interviews",
    description: "Schedule informational interviews to learn about roles and companies",
    category: "networking",
    type: "short_term",
    priority: "medium",
    metric: "Complete 20 informational interviews in 2 months"
  },
  {
    title: "Improve Interview Performance",
    description: "Practice and refine interview skills to increase success rate",
    category: "skill_development",
    type: "short_term",
    priority: "high",
    metric: "Complete 10 mock interviews and receive positive feedback"
  },
  {
    title: "Optimize LinkedIn Profile",
    description: "Create a compelling LinkedIn presence to attract recruiters",
    category: "career_advancement",
    type: "milestone",
    priority: "high",
    metric: "Achieve 'All-Star' profile status and 500+ connections"
  },
  {
    title: "Develop Portfolio Projects",
    description: "Create showcase projects that demonstrate your skills to potential employers",
    category: "skill_development",
    type: "long_term",
    priority: "medium",
    metric: "Complete 3 portfolio-worthy projects"
  },
  {
    title: "Master New Technology Stack",
    description: "Learn and become proficient in a new technology relevant to your target roles",
    category: "skill_development",
    type: "long_term",
    priority: "medium",
    metric: "Build 2 projects using the new technology"
  },
  {
    title: "Attend Industry Conferences",
    description: "Participate in industry events to learn and network",
    category: "networking",
    type: "long_term",
    priority: "low",
    metric: "Attend 2 industry conferences or virtual summits"
  },
  {
    title: "Secure 5 Second-Round Interviews",
    description: "Progress to advanced interview stages with target companies",
    category: "job_search",
    type: "short_term",
    priority: "high",
    metric: "Reach second-round interviews with 5 companies"
  },
  {
    title: "Build Personal Brand",
    description: "Establish yourself as a thought leader through content creation",
    category: "career_advancement",
    type: "long_term",
    priority: "low",
    metric: "Publish 12 blog posts or industry articles"
  }
];

export function SuggestedGoals({ onSelectGoal }: SuggestedGoalsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-yellow-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Suggested Goals
          </CardTitle>
          <CardDescription>
            Choose from these pre-made goals to kickstart your career journey
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestedGoals.map((goal, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-relaxed flex-1">{goal.title}</CardTitle>
                <Badge className={getPriorityColor(goal.priority)}>
                  {goal.priority}
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                <Badge variant="outline" className="text-xs">
                  {goal.category.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {goal.type.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {goal.description}
              </p>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium mb-1">Success Metric:</p>
                <p className="text-xs text-muted-foreground">{goal.metric}</p>
              </div>
              <Button 
                onClick={() => onSelectGoal(goal)} 
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add This Goal
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
