import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ExternalLink, CheckCircle, Trophy, Star } from 'lucide-react';

interface ProfileCertificationsBadgesProps {
  userId?: string;
}

export function ProfileCertificationsBadges({ userId }: ProfileCertificationsBadgesProps) {
  const { data: certifications, isLoading } = useQuery({
    queryKey: ['profile-certifications', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('external_certifications')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('show_on_profile', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || !certifications || certifications.length === 0) {
    return null;
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5" />
          Skills & Certifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert: any) => (
            <a
              key={cert.id}
              href={cert.verification_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Badge 
                variant="secondary" 
                className="gap-2 py-2 px-3 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {cert.badge_image_url ? (
                  <img 
                    src={cert.badge_image_url} 
                    alt={cert.certification_name}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
                  getTypeIcon(cert.certification_type)
                )}
                <span>{cert.certification_name}</span>
                {cert.score && (
                  <span className="text-xs opacity-75">({cert.score})</span>
                )}
                {cert.verification_status === 'verified' && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
                {cert.verification_url && (
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Badge>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
