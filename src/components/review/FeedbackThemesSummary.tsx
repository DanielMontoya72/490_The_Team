import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, CheckCircle2, AlertCircle, FileText, Lightbulb } from "lucide-react";

interface FeedbackItem {
  id: string;
  comment_text: string;
  section_reference?: string;
  status: string;
  feedback_theme?: string;
  implemented_at?: string;
  reviewer_name: string;
  created_at: string;
}

interface FeedbackThemesSummaryProps {
  feedback: FeedbackItem[];
  onUpdateTheme?: (feedbackId: string, theme: string) => void;
}

const FEEDBACK_THEMES = [
  { value: "formatting", label: "Formatting & Layout", color: "bg-blue-500" },
  { value: "content", label: "Content Quality", color: "bg-green-500" },
  { value: "grammar", label: "Grammar & Spelling", color: "bg-yellow-500" },
  { value: "clarity", label: "Clarity & Conciseness", color: "bg-purple-500" },
  { value: "achievements", label: "Achievements & Impact", color: "bg-orange-500" },
  { value: "relevance", label: "Relevance to Role", color: "bg-pink-500" },
  { value: "keywords", label: "Keywords & ATS", color: "bg-cyan-500" },
  { value: "structure", label: "Structure & Organization", color: "bg-indigo-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export function FeedbackThemesSummary({ feedback, onUpdateTheme }: FeedbackThemesSummaryProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>("all");

  const themeAnalysis = useMemo(() => {
    const themes: Record<string, { count: number; resolved: number; items: FeedbackItem[] }> = {};
    
    feedback.forEach(item => {
      const theme = item.feedback_theme || "unclassified";
      if (!themes[theme]) {
        themes[theme] = { count: 0, resolved: 0, items: [] };
      }
      themes[theme].count++;
      if (item.status === "resolved") {
        themes[theme].resolved++;
      }
      themes[theme].items.push(item);
    });

    return themes;
  }, [feedback]);

  const totalFeedback = feedback.length;
  const resolvedFeedback = feedback.filter(f => f.status === "resolved").length;
  const implementedFeedback = feedback.filter(f => f.implemented_at).length;
  const resolutionRate = totalFeedback > 0 ? (resolvedFeedback / totalFeedback) * 100 : 0;
  const implementationRate = totalFeedback > 0 ? (implementedFeedback / totalFeedback) * 100 : 0;

  const topThemes = Object.entries(themeAnalysis)
    .filter(([key]) => key !== "unclassified")
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const filteredFeedback = selectedTheme === "all" 
    ? feedback 
    : feedback.filter(f => f.feedback_theme === selectedTheme);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalFeedback}</p>
                <p className="text-xs text-muted-foreground">Total Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resolvedFeedback}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{resolutionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Resolution Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{implementedFeedback}</p>
                <p className="text-xs text-muted-foreground">Implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Feedback Themes Distribution
          </CardTitle>
          <CardDescription>
            Analysis of feedback categories and resolution status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topThemes.length > 0 ? (
            topThemes.map(([theme, data]) => {
              const themeInfo = FEEDBACK_THEMES.find(t => t.value === theme);
              const resolutionPercentage = data.count > 0 ? (data.resolved / data.count) * 100 : 0;
              
              return (
                <div key={theme} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${themeInfo?.color || 'bg-gray-500'}`} />
                      <span className="font-medium">{themeInfo?.label || theme}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{data.count} items</Badge>
                      <Badge variant={data.resolved === data.count ? "default" : "secondary"}>
                        {data.resolved}/{data.count} resolved
                      </Badge>
                    </div>
                  </div>
                  <Progress value={resolutionPercentage} className="h-2" />
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No categorized feedback yet</p>
              <p className="text-sm">Assign themes to feedback items to see distribution</p>
            </div>
          )}

          {themeAnalysis.unclassified?.count > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm">Unclassified feedback</span>
                <Badge variant="outline">{themeAnalysis.unclassified.count} items</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement Insights</CardTitle>
          <CardDescription>
            Key areas to focus on based on feedback patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topThemes.length > 0 ? (
            <div className="space-y-3">
              {topThemes.slice(0, 3).map(([theme, data], index) => {
                const themeInfo = FEEDBACK_THEMES.find(t => t.value === theme);
                const unresolvedCount = data.count - data.resolved;
                
                return (
                  <div key={theme} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`w-6 h-6 rounded-full ${themeInfo?.color || 'bg-gray-500'} flex items-center justify-center text-white text-sm font-bold`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{themeInfo?.label || theme}</p>
                      <p className="text-sm text-muted-foreground">
                        {unresolvedCount > 0 
                          ? `${unresolvedCount} item${unresolvedCount > 1 ? 's' : ''} still need attention`
                          : 'All feedback addressed!'
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              Categorize feedback to receive improvement insights
            </p>
          )}
        </CardContent>
      </Card>

      {/* Feedback List with Theme Assignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feedback Details</CardTitle>
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {FEEDBACK_THEMES.map(theme => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
                <SelectItem value="unclassified">Unclassified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredFeedback.map(item => (
              <div key={item.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{item.comment_text}</p>
                  <Badge variant={item.status === "resolved" ? "default" : "outline"}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    by {item.reviewer_name}
                  </span>
                  {item.section_reference && (
                    <Badge variant="secondary" className="text-xs">
                      {item.section_reference}
                    </Badge>
                  )}
                  {onUpdateTheme && (
                    <Select 
                      value={item.feedback_theme || "unclassified"} 
                      onValueChange={(value) => onUpdateTheme(item.id, value)}
                    >
                      <SelectTrigger className="h-6 text-xs w-32">
                        <SelectValue placeholder="Set theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_THEMES.map(theme => (
                          <SelectItem key={theme.value} value={theme.value}>
                            {theme.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {item.implemented_at && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      Implemented
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {filteredFeedback.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">
                No feedback matching the selected filter
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
