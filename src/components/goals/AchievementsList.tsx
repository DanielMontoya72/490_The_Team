import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  achievement_title: string;
  achievement_description: string;
  achievement_date: string;
  celebration_notes: string;
  impact_on_career: string;
}

interface AchievementsListProps {
  achievements: Achievement[];
}

export function AchievementsList({ achievements }: AchievementsListProps) {
  if (!achievements || achievements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No achievements yet. Complete goals to celebrate your wins!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {achievements.map((achievement) => (
        <Card key={achievement.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Award className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {achievement.achievement_title}
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                </CardTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(achievement.achievement_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievement.achievement_description && (
              <p className="text-sm">{achievement.achievement_description}</p>
            )}
            {achievement.celebration_notes && (
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">🎉 Celebration</p>
                <p className="text-sm text-muted-foreground">{achievement.celebration_notes}</p>
              </div>
            )}
            {achievement.impact_on_career && (
              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">💼 Career Impact</p>
                <p className="text-sm text-muted-foreground">{achievement.impact_on_career}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}