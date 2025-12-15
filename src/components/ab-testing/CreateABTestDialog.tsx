import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateABTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'resume' | 'cover_letter';
}

export function CreateABTestDialog({ open, onOpenChange, defaultType = 'resume' }: CreateABTestDialogProps) {
  const queryClient = useQueryClient();
  const [testName, setTestName] = useState('');
  const [materialType, setMaterialType] = useState<'resume' | 'cover_letter'>(defaultType);
  const [variantAId, setVariantAId] = useState('');
  const [variantBId, setVariantBId] = useState('');

  // Fetch resumes
  const { data: resumes } = useQuery({
    queryKey: ['resumes-for-ab-test'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('resumes')
        .select('id, resume_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && materialType === 'resume'
  });

  // Fetch cover letters
  const { data: coverLetters } = useQuery({
    queryKey: ['cover-letters-for-ab-test'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('application_materials')
        .select('id, version_name')
        .eq('user_id', user.id)
        .eq('material_type', 'cover_letter')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && materialType === 'cover_letter'
  });

  const materials = materialType === 'resume' ? resumes : coverLetters;
  const materialLabel = materialType === 'resume' ? 'resume_name' : 'version_name';

  const createTestMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const variantAMaterial = materials?.find(m => m.id === variantAId);
      const variantBMaterial = materials?.find(m => m.id === variantBId);

      const { error } = await supabase
        .from('material_ab_tests')
        .insert({
          user_id: user.id,
          test_name: testName,
          material_type: materialType,
          variant_a_id: variantAId,
          variant_b_id: variantBId,
          variant_a_name: variantAMaterial?.[materialLabel] || 'Variant A',
          variant_b_name: variantBMaterial?.[materialLabel] || 'Variant B',
          status: 'active'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-ab-tests'] });
      toast.success('A/B test created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create test: ' + error.message);
    }
  });

  const resetForm = () => {
    setTestName('');
    setVariantAId('');
    setVariantBId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName || !variantAId || !variantBId) {
      toast.error('Please fill in all fields');
      return;
    }
    if (variantAId === variantBId) {
      toast.error('Please select different materials for each variant');
      return;
    }
    createTestMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
          <DialogDescription>
            Select two versions of your {materialType === 'resume' ? 'resume' : 'cover letter'} to compare their effectiveness.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testName">Test Name</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Resume Format Comparison Q1"
            />
          </div>

          <div className="space-y-2">
            <Label>Material Type</Label>
            <Select value={materialType} onValueChange={(v: 'resume' | 'cover_letter') => {
              setMaterialType(v);
              setVariantAId('');
              setVariantBId('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resume">Resume</SelectItem>
                <SelectItem value="cover_letter">Cover Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Variant A</Label>
              <Select value={variantAId} onValueChange={setVariantAId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials?.map(m => (
                    <SelectItem key={m.id} value={m.id} disabled={m.id === variantBId}>
                      {m[materialLabel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variant B</Label>
              <Select value={variantBId} onValueChange={setVariantBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials?.map(m => (
                    <SelectItem key={m.id} value={m.id} disabled={m.id === variantAId}>
                      {m[materialLabel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(materials?.length || 0) < 2 && (
            <p className="text-sm text-amber-600">
              You need at least 2 {materialType === 'resume' ? 'resumes' : 'cover letters'} to create an A/B test.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTestMutation.isPending || (materials?.length || 0) < 2}
            >
              {createTestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Test
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
