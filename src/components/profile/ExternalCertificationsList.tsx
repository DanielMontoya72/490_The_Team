import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Award, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Loader2,
  Trophy,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';

export function ExternalCertificationsList() {
  const queryClient = useQueryClient();

  const { data: certifications, isLoading } = useQuery({
    queryKey: ['external-certifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('external_certifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, showOnProfile }: { id: string; showOnProfile: boolean }) => {
      const { error } = await supabase
        .from('external_certifications')
        .update({ show_on_profile: showOnProfile })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
    },
    onError: (error) => {
      console.error('Toggle error:', error);
      toast.error('Failed to update visibility');
    },
  });

  const deleteCertMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Certification removed');
      queryClient.invalidateQueries({ queryKey: ['external-certifications'] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to remove certification');
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'badge':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'certificate':
        return <Award className="h-4 w-4 text-blue-500" />;
      case 'course':
        return <Star className="h-4 w-4 text-green-500" />;
      case 'skill':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case 'manual':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Manual
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case 'leetcode':
        return '🧩';
      case 'hackerrank':
        return '💻';
      case 'codecademy':
        return '📚';
      default:
        return '📝';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certifications || certifications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications & Badges
        </CardTitle>
        <CardDescription>
          Your verified skills and achievements from external platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {certifications.map((cert: any) => (
            <div 
              key={cert.id} 
              className={`p-4 border rounded-lg space-y-3 ${
                !cert.show_on_profile ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {cert.badge_image_url ? (
                    <img 
                      src={cert.badge_image_url} 
                      alt={cert.certification_name}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {getTypeIcon(cert.certification_type)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-sm">{cert.certification_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs">{getPlatformEmoji(cert.platform_name)}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {cert.platform_name}
                      </span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(cert.verification_status)}
              </div>

              {(cert.score || cert.ranking) && (
                <div className="flex gap-4 text-sm">
                  {cert.score && (
                    <div>
                      <span className="text-muted-foreground">Score: </span>
                      <span className="font-medium">{cert.score}</span>
                    </div>
                  )}
                  {cert.ranking && (
                    <div>
                      <span className="text-muted-foreground">Rank: </span>
                      <span className="font-medium">{cert.ranking}</span>
                    </div>
                  )}
                </div>
              )}

              {cert.metadata && Object.keys(cert.metadata).length > 0 && cert.metadata.easy !== undefined && (
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs bg-green-500/10">
                    Easy: {cert.metadata.easy}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-amber-500/10">
                    Medium: {cert.metadata.medium}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-red-500/10">
                    Hard: {cert.metadata.hard}
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cert.show_on_profile}
                    onCheckedChange={(checked) => 
                      toggleVisibilityMutation.mutate({ id: cert.id, showOnProfile: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {cert.show_on_profile ? (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Visible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Hidden
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {cert.verification_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={cert.verification_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCertMutation.mutate(cert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
