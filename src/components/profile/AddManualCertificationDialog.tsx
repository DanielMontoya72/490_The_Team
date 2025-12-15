import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddManualCertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: any[];
}

const CERTIFICATION_TYPES = [
  { id: 'certificate', name: 'Certificate' },
  { id: 'badge', name: 'Badge' },
  { id: 'course', name: 'Course Completion' },
  { id: 'skill', name: 'Skill Assessment' },
];

const MANUAL_PLATFORMS = [
  { id: 'leetcode', name: 'LeetCode' },
  { id: 'hackerrank', name: 'HackerRank' },
  { id: 'codecademy', name: 'Codecademy' },
  { id: 'coursera', name: 'Coursera' },
  { id: 'udemy', name: 'Udemy' },
  { id: 'pluralsight', name: 'Pluralsight' },
  { id: 'linkedin_learning', name: 'LinkedIn Learning' },
  { id: 'other', name: 'Other' },
];

export function AddManualCertificationDialog({
  open,
  onOpenChange,
  platforms,
}: AddManualCertificationDialogProps) {
  const [platformName, setPlatformName] = useState('');
  const [certificationName, setCertificationName] = useState('');
  const [certificationType, setCertificationType] = useState('certificate');
  const [score, setScore] = useState('');
  const [ranking, setRanking] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const queryClient = useQueryClient();

  const addCertificationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find platform ID if exists
      const platform = platforms.find(p => p.platform_name === platformName);

      const { error } = await supabase
        .from('external_certifications')
        .insert({
          user_id: user.id,
          platform_id: platform?.id || null,
          platform_name: platformName,
          certification_name: certificationName,
          certification_type: certificationType,
          score: score || null,
          ranking: ranking || null,
          verification_url: verificationUrl || null,
          completion_date: completionDate || null,
          is_verified: false,
          verification_status: 'manual',
          show_on_profile: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Certification added!');
      queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Add certification error:', error);
      toast.error('Failed to add certification');
    },
  });

  const resetForm = () => {
    setPlatformName('');
    setCertificationName('');
    setCertificationType('certificate');
    setScore('');
    setRanking('');
    setVerificationUrl('');
    setCompletionDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Certification</DialogTitle>
          <DialogDescription>
            Add a certification or badge that can't be automatically imported
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platformName} onValueChange={setPlatformName}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certName">Certification Name *</Label>
            <Input
              id="certName"
              placeholder="e.g., Python Developer Certificate"
              value={certificationName}
              onChange={(e) => setCertificationName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={certificationType} onValueChange={setCertificationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATION_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score (optional)</Label>
              <Input
                id="score"
                placeholder="e.g., 95%"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ranking">Ranking (optional)</Label>
              <Input
                id="ranking"
                placeholder="e.g., Top 5%"
                value={ranking}
                onChange={(e) => setRanking(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verificationUrl">Verification URL (optional)</Label>
            <Input
              id="verificationUrl"
              type="url"
              placeholder="https://..."
              value={verificationUrl}
              onChange={(e) => setVerificationUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completionDate">Completion Date (optional)</Label>
            <Input
              id="completionDate"
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => addCertificationMutation.mutate()}
            disabled={!platformName || !certificationName || addCertificationMutation.isPending}
          >
            {addCertificationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Certification'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
