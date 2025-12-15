import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FlaskConical, Plus, Trophy, Loader2 } from 'lucide-react';

export function TimingABTestResults() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [testName, setTestName] = useState('');
  const [variantA, setVariantA] = useState('Morning (9-11 AM)');
  const [variantB, setVariantB] = useState('Afternoon (2-4 PM)');
  const queryClient = useQueryClient();

  const { data: abTests, isLoading } = useQuery({
    queryKey: ['timing-ab-tests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('timing_ab_tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('timing_ab_tests')
        .insert({
          user_id: user.id,
          test_name: testName,
          variant_a_description: variantA,
          variant_b_description: variantB,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('A/B test created!');
      queryClient.invalidateQueries({ queryKey: ['timing-ab-tests'] });
      setShowCreateDialog(false);
      setTestName('');
    },
    onError: (error) => {
      console.error('Create test error:', error);
      toast.error('Failed to create A/B test');
    },
  });

  const calculateWinner = (test: any) => {
    const rateA = test.variant_a_submissions > 0 
      ? (test.variant_a_responses / test.variant_a_submissions) * 100 
      : 0;
    const rateB = test.variant_b_submissions > 0 
      ? (test.variant_b_responses / test.variant_b_submissions) * 100 
      : 0;

    if (test.variant_a_submissions < 5 || test.variant_b_submissions < 5) {
      return { winner: 'none', significance: 0, rateA, rateB };
    }

    // Simple significance calculation (z-test approximation)
    const totalA = test.variant_a_submissions;
    const totalB = test.variant_b_submissions;
    const pooledRate = (test.variant_a_responses + test.variant_b_responses) / (totalA + totalB);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/totalA + 1/totalB));
    const z = se > 0 ? Math.abs((rateA - rateB) / 100) / se : 0;
    const significance = z > 1.96 ? 95 : z > 1.645 ? 90 : 0;

    return {
      winner: rateA > rateB ? 'A' : rateB > rateA ? 'B' : 'tie',
      significance,
      rateA,
      rateB,
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4" />
              Timing A/B Tests
            </CardTitle>
            <CardDescription>
              Compare different submission timing strategies
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Test
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : abTests && abTests.length > 0 ? (
          <div className="space-y-4">
            {abTests.map((test) => {
              const result = calculateWinner(test);
              return (
                <div key={test.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{test.test_name}</h4>
                    {test.is_active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Completed</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg ${result.winner === 'A' ? 'bg-green-500/10 border border-green-500' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Variant A</span>
                        {result.winner === 'A' && (
                          <Trophy className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {test.variant_a_description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={result.rateA} className="h-2" />
                        <span className="text-sm font-medium w-12 text-right">
                          {result.rateA.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {test.variant_a_responses}/{test.variant_a_submissions} responses
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg ${result.winner === 'B' ? 'bg-green-500/10 border border-green-500' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Variant B</span>
                        {result.winner === 'B' && (
                          <Trophy className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {test.variant_b_description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={result.rateB} className="h-2" />
                        <span className="text-sm font-medium w-12 text-right">
                          {result.rateB.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {test.variant_b_responses}/{test.variant_b_submissions} responses
                      </p>
                    </div>
                  </div>

                  {result.significance > 0 && (
                    <div className="text-sm text-center text-muted-foreground">
                      Statistical significance: {result.significance}% confidence
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Create an A/B test to compare different timing strategies
            </p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create First Test
            </Button>
          </div>
        )}

        {/* Create Test Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Timing A/B Test</DialogTitle>
              <DialogDescription>
                Compare two timing strategies to find what works best for you
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <Input
                  id="testName"
                  placeholder="e.g., Morning vs Afternoon Submissions"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variantA">Variant A (Control)</Label>
                <Input
                  id="variantA"
                  placeholder="e.g., Morning (9-11 AM)"
                  value={variantA}
                  onChange={(e) => setVariantA(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variantB">Variant B (Test)</Label>
                <Input
                  id="variantB"
                  placeholder="e.g., Afternoon (2-4 PM)"
                  value={variantB}
                  onChange={(e) => setVariantB(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createTestMutation.mutate()}
                disabled={!testName || createTestMutation.isPending}
              >
                {createTestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Test'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
