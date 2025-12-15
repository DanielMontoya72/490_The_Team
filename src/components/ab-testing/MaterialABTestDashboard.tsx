import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FlaskConical, FileText, Mail } from 'lucide-react';
import { CreateABTestDialog } from './CreateABTestDialog';
import { ABTestCard } from './ABTestCard';
import { ABTestInsights } from './ABTestInsights';

export function MaterialABTestDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [materialType, setMaterialType] = useState<'resume' | 'cover_letter'>('resume');

  const { data: tests, isLoading } = useQuery({
    queryKey: ['material-ab-tests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('material_ab_tests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const activeTests = tests?.filter(t => t.status === 'active') || [];
  const completedTests = tests?.filter(t => t.status === 'completed') || [];
  const resumeTests = tests?.filter(t => t.material_type === 'resume') || [];
  const coverLetterTests = tests?.filter(t => t.material_type === 'cover_letter') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            A/B Testing Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Test different versions of your materials to find what works best
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New A/B Test
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeTests.length}</div>
            <p className="text-sm text-muted-foreground">Active Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{completedTests.length}</div>
            <p className="text-sm text-muted-foreground">Completed Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {resumeTests.length}
            </div>
            <p className="text-sm text-muted-foreground">Resume Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-500" />
              {coverLetterTests.length}
            </div>
            <p className="text-sm text-muted-foreground">Cover Letter Tests</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Tests ({activeTests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTests.length})</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading tests...
              </CardContent>
            </Card>
          ) : activeTests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Tests</h3>
                <p className="text-muted-foreground mb-4">
                  Create an A/B test to compare different versions of your resume or cover letter
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeTests.map(test => (
                <ABTestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed tests yet. Complete an A/B test to see results here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedTests.map(test => (
                <ABTestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights">
          <ABTestInsights tests={tests || []} />
        </TabsContent>
      </Tabs>

      <CreateABTestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType={materialType}
      />
    </div>
  );
}
