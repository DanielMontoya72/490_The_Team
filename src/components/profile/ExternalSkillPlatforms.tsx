import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Code2, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Award, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Loader2,
  Trophy,
  Star
} from 'lucide-react';
import { ExternalCertificationsList } from './ExternalCertificationsList';
import { AddManualCertificationDialog } from './AddManualCertificationDialog';

const PLATFORMS = [
  { 
    id: 'leetcode', 
    name: 'LeetCode', 
    icon: '🧩',
    description: 'Coding challenges and interview prep',
    supportsSync: true,
  },
  { 
    id: 'hackerrank', 
    name: 'HackerRank', 
    icon: '💻',
    description: 'Technical assessments and skill certifications',
    supportsSync: true,
  },
  { 
    id: 'codecademy', 
    name: 'Codecademy', 
    icon: '📚',
    description: 'Interactive coding courses',
    supportsSync: false,
  },
];

export function ExternalSkillPlatforms() {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showManualCertDialog, setShowManualCertDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [username, setUsername] = useState('');
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ['external-skill-platforms'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('external_skill_platforms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const connectPlatformMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('sync-skill-platform', {
        body: {
          platformName: selectedPlatform,
          username,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${selectedPlatform} profile connected successfully!`);
        queryClient.invalidateQueries({ queryKey: ['external-skill-platforms'] });
        queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
        setShowConnectDialog(false);
        setUsername('');
        setSelectedPlatform('');
      }
    },
    onError: (error) => {
      console.error('Connect error:', error);
      toast.error('Failed to connect platform');
    },
  });

  const syncPlatformMutation = useMutation({
    mutationFn: async (platform: any) => {
      setSyncingPlatform(platform.platform_name);
      
      const response = await supabase.functions.invoke('sync-skill-platform', {
        body: {
          platformName: platform.platform_name,
          username: platform.username,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success('Platform data synced!');
      queryClient.invalidateQueries({ queryKey: ['external-skill-platforms'] });
      queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
      setSyncingPlatform(null);
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast.error('Failed to sync platform data');
      setSyncingPlatform(null);
    },
  });

  const disconnectPlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const { error } = await supabase
        .from('external_skill_platforms')
        .delete()
        .eq('id', platformId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Platform disconnected');
      queryClient.invalidateQueries({ queryKey: ['external-skill-platforms'] });
      queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
    },
    onError: (error) => {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect platform');
    },
  });

  const getPlatformInfo = (platformName: string) => {
    return PLATFORMS.find(p => p.id === platformName);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">External Skills Platforms</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Link your coding profiles to showcase verified skills and certifications
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setShowManualCertDialog(true)}
                className="flex-1 sm:flex-initial"
              >
                <Award className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Manual</span>
                <span className="sm:hidden">Manual</span>
              </Button>
              <Button 
                onClick={() => setShowConnectDialog(true)}
                className="flex-1 sm:flex-initial"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Connect Platform</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPlatforms ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : platforms && platforms.length > 0 ? (
            <div className="space-y-4">
              {platforms.map((platform: any) => {
                const info = getPlatformInfo(platform.platform_name);
                return (
                  <div 
                    key={platform.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{info?.icon || '📝'}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{info?.name || platform.platform_name}</h4>
                          {platform.is_verified ? (
                            <Badge variant="default" className="gap-1 bg-green-500">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{platform.username}
                        </p>
                        {platform.last_synced_at && (
                          <p className="text-xs text-muted-foreground">
                            Last synced: {new Date(platform.last_synced_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={platform.profile_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {info?.supportsSync && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncPlatformMutation.mutate(platform)}
                          disabled={syncingPlatform === platform.platform_name}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncingPlatform === platform.platform_name ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectPlatformMutation.mutate(platform.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Platforms Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your LeetCode, HackerRank, or Codecademy profiles to showcase your skills
              </p>
              <Button onClick={() => setShowConnectDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Platform
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications List */}
      <ExternalCertificationsList />

      {/* Connect Platform Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect External Platform</DialogTitle>
            <DialogDescription>
              Link your coding profile to import skills and certifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <div className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                        {!platform.supportsSync && (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlatform && (
                <p className="text-xs text-muted-foreground">
                  {getPlatformInfo(selectedPlatform)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username on the platform"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {selectedPlatform && !getPlatformInfo(selectedPlatform)?.supportsSync && (
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  This platform doesn't have a public API. You can add certifications manually after connecting.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => connectPlatformMutation.mutate()}
              disabled={!selectedPlatform || !username || connectPlatformMutation.isPending}
            >
              {connectPlatformMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Platform'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Certification Dialog */}
      <AddManualCertificationDialog
        open={showManualCertDialog}
        onOpenChange={setShowManualCertDialog}
        platforms={platforms || []}
      />
    </div>
  );
}
