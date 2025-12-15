import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  FileText, 
  Type, 
  Ruler, 
  Palette,
  ArrowRight,
  Archive,
  Copy,
  Sparkles
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestSuccessInsightsProps {
  test: {
    id: string;
    variant_a_id: string;
    variant_b_id: string;
    variant_a_name: string;
    variant_b_name: string;
    material_type: string;
    winner: string | null;
  };
  metricsA: {
    responseRate: number;
    interviewRate: number;
    total: number;
  };
  metricsB: {
    responseRate: number;
    interviewRate: number;
    total: number;
  };
  isSignificant: boolean;
}

export function TestSuccessInsights({ test, metricsA, metricsB, isSignificant }: TestSuccessInsightsProps) {
  const queryClient = useQueryClient();

  const winningVariant = test.winner || (metricsA.responseRate > metricsB.responseRate ? 'A' : 'B');
  const winningName = winningVariant === 'A' ? test.variant_a_name : test.variant_b_name;
  const losingName = winningVariant === 'A' ? test.variant_b_name : test.variant_a_name;
  const losingId = winningVariant === 'A' ? test.variant_b_id : test.variant_a_id;
  const winningMetrics = winningVariant === 'A' ? metricsA : metricsB;
  const losingMetrics = winningVariant === 'A' ? metricsB : metricsA;

  // Archive mutation for underperforming version
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('application_materials')
        .update({ is_archived: true })
        .eq('id', losingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-materials'] });
      toast.success(`Archived underperforming ${test.material_type === 'resume' ? 'resume' : 'cover letter'}`);
    },
    onError: (error) => {
      toast.error('Failed to archive: ' + error.message);
    }
  });

  // Generate insights based on variant names and performance
  const generateInsights = () => {
    const insights: Array<{ icon: React.ReactNode; title: string; description: string; type: 'format' | 'content' | 'length' }> = [];

    const winningLower = winningName.toLowerCase();
    const losingLower = losingName.toLowerCase();

    // Format insights
    if (winningLower.includes('modern') || winningLower.includes('clean')) {
      insights.push({
        icon: <Palette className="h-4 w-4 text-purple-500" />,
        title: 'Modern Format Works Better',
        description: 'Clean, modern layouts tend to perform better with ATS systems and recruiters',
        type: 'format'
      });
    }

    if (winningLower.includes('traditional') || winningLower.includes('classic')) {
      insights.push({
        icon: <Palette className="h-4 w-4 text-purple-500" />,
        title: 'Traditional Format Preferred',
        description: 'Conservative, traditional formats may work better for your target industry',
        type: 'format'
      });
    }

    if (winningLower.includes('creative') || winningLower.includes('portfolio')) {
      insights.push({
        icon: <Palette className="h-4 w-4 text-purple-500" />,
        title: 'Creative Approach Wins',
        description: 'Creative formatting and portfolio-style presentations drive better responses',
        type: 'format'
      });
    }

    if (winningLower.includes('technical') || winningLower.includes('engineering')) {
      insights.push({
        icon: <FileText className="h-4 w-4 text-blue-500" />,
        title: 'Technical Focus Effective',
        description: 'Emphasizing technical skills and achievements resonates with your target roles',
        type: 'content'
      });
    }

    if (winningLower.includes('chronological')) {
      insights.push({
        icon: <Type className="h-4 w-4 text-green-500" />,
        title: 'Chronological Order Preferred',
        description: 'A chronological format helps employers quickly understand your career progression',
        type: 'format'
      });
    }

    // Response rate based insights
    if (winningMetrics.responseRate > 30) {
      insights.push({
        icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
        title: 'Strong Performance',
        description: `${winningMetrics.responseRate.toFixed(1)}% response rate is excellent. Keep using this approach!`,
        type: 'content'
      });
    }

    // Interview conversion insights
    if (winningMetrics.interviewRate > 20) {
      insights.push({
        icon: <Sparkles className="h-4 w-4 text-green-500" />,
        title: 'High Interview Conversion',
        description: 'Your winning variant converts responses to interviews effectively',
        type: 'content'
      });
    }

    // If no specific insights, add general ones
    if (insights.length === 0) {
      const rateDiff = Math.abs(metricsA.responseRate - metricsB.responseRate);
      
      if (rateDiff > 10) {
        insights.push({
          icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
          title: 'Significant Difference Found',
          description: `There's a ${rateDiff.toFixed(1)}% difference in response rates. The winning version resonates better with employers.`,
          type: 'content'
        });
      }

      insights.push({
        icon: <FileText className="h-4 w-4 text-blue-500" />,
        title: 'Continue Testing',
        description: 'Consider testing specific elements (headlines, skills section, summary) to identify what drives success',
        type: 'content'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  // Don't show if not enough data
  if (metricsA.total < 5 && metricsB.total < 5) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Success Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What Elements Drive Success */}
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-background/50">
              {insight.icon}
              <div>
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs shrink-0">
                {insight.type}
              </Badge>
            </div>
          ))}
        </div>

        {/* Actions for winner/loser */}
        {isSignificant && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recommended Actions:</p>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                <Archive className="h-3 w-3 mr-1" />
                Archive Underperformer ({losingName.slice(0, 20)}...)
              </Button>
              
              <Button 
                size="sm" 
                variant="default" 
                className="text-xs"
                onClick={() => {
                  toast.info(`Use "${winningName}" as your default and create variations to test further improvements`);
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Iterate on Winner
              </Button>
            </div>
          </div>
        )}

        {!isSignificant && (metricsA.total >= 10 && metricsB.total >= 10) && (
          <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            Results are not yet statistically significant. Both variants perform similarly - 
            consider testing more dramatic variations.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
