import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface IndustryBenchmarksProps {
  benchmarks?: {
    entry_level_median?: number;
    mid_level_median?: number;
    senior_level_median?: number;
    executive_level_median?: number;
    your_trajectory_vs_benchmark?: string;
  };
  currentSalary: number;
}

export function IndustryBenchmarks({ benchmarks, currentSalary }: IndustryBenchmarksProps) {
  const levels = [
    { label: 'Entry Level', value: benchmarks?.entry_level_median || 50000 },
    { label: 'Mid Level', value: benchmarks?.mid_level_median || 80000 },
    { label: 'Senior Level', value: benchmarks?.senior_level_median || 120000 },
    { label: 'Executive', value: benchmarks?.executive_level_median || 180000 },
  ];

  const maxValue = Math.max(...levels.map(l => l.value), currentSalary) * 1.1;

  // Determine current level
  const getCurrentLevel = () => {
    if (currentSalary >= (benchmarks?.executive_level_median || 180000)) return 'Executive';
    if (currentSalary >= (benchmarks?.senior_level_median || 120000)) return 'Senior Level';
    if (currentSalary >= (benchmarks?.mid_level_median || 80000)) return 'Mid Level';
    return 'Entry Level';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Industry Salary Benchmarks</CardTitle>
            <CardDescription>Compare your salary against industry career levels</CardDescription>
          </div>
          <Badge>{getCurrentLevel()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benchmark Bars */}
        <div className="space-y-4">
          {levels.map((level, index) => {
            const percentage = (level.value / maxValue) * 100;
            const yourPercentage = (currentSalary / maxValue) * 100;
            const isCurrentLevel = currentSalary >= level.value && 
              (index === levels.length - 1 || currentSalary < levels[index + 1]?.value);

            return (
              <div key={level.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={isCurrentLevel ? 'font-medium text-primary' : ''}>
                    {level.label}
                  </span>
                  <span className="text-muted-foreground">
                    ${level.value.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-3" />
                  {/* Current salary marker */}
                  <div 
                    className="absolute top-0 h-3 w-0.5 bg-destructive"
                    style={{ left: `${yourPercentage}%` }}
                    title={`Your salary: $${currentSalary.toLocaleString()}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Industry Benchmark</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive" />
            <span>Your Current Salary</span>
          </div>
        </div>

        {/* Trajectory Analysis */}
        {benchmarks?.your_trajectory_vs_benchmark && (
          <div className="p-4 bg-muted rounded-lg mt-4">
            <p className="text-sm font-medium mb-1">Your Trajectory vs Benchmark</p>
            <p className="text-sm text-muted-foreground">{benchmarks.your_trajectory_vs_benchmark}</p>
          </div>
        )}

        {/* Progress to Next Level */}
        {currentSalary < (benchmarks?.executive_level_median || 180000) && (
          <div className="p-4 border rounded-lg">
            <p className="text-sm font-medium mb-2">Progress to Next Level</p>
            {levels.map((level, index) => {
              if (currentSalary < level.value) {
                const prevLevel = index > 0 ? levels[index - 1].value : 0;
                const progress = ((currentSalary - prevLevel) / (level.value - prevLevel)) * 100;
                const gapToNext = level.value - currentSalary;
                
                return (
                  <div key={level.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>To {level.label}</span>
                      <span className="text-muted-foreground">
                        ${gapToNext.toLocaleString()} to go
                      </span>
                    </div>
                    <Progress value={Math.max(0, progress)} className="h-2" />
                  </div>
                );
              }
              return null;
            }).find(Boolean)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
