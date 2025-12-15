import { Building2, Globe, Users, MapPin, Star, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CompanyResearch } from './CompanyResearch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfoTabProps {
  job: any;
}

export function CompanyInfoTab({ job }: CompanyInfoTabProps) {
  // Check if company research exists
  const { data: companyResearch } = useQuery({
    queryKey: ['company-research', job.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_research')
        .select('id')
        .eq('job_id', job.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-6 p-6">
      {/* Company Header */}
      <div className="flex items-start gap-4">
        {job.company_logo_url ? (
          <img 
            src={job.company_logo_url} 
            alt={`${job.company_name} logo`}
            className="w-16 h-16 rounded-lg object-contain border"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-1">{job.company_name}</h2>
          {job.industry && (
            <Badge variant="secondary" className="mb-2">{job.industry}</Badge>
          )}
          {job.company_rating && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{job.company_rating}</span>
              <span className="text-muted-foreground">/ 5.0</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Company Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {job.company_size && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company Size</p>
                <p className="font-semibold">{job.company_size}</p>
              </div>
            </div>
          </Card>
        )}

        {job.location && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{job.location}</p>
              </div>
            </div>
          </Card>
        )}

        {job.company_website && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Website</p>
                <a 
                  href={job.company_website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline truncate block"
                >
                  {job.company_website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </div>
            </div>
          </Card>
        )}

        {job.industry && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-semibold">{job.industry}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Company Description */}
      {job.company_description && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">About {job.company_name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {job.company_description}
          </p>
        </div>
      )}

      <Separator />

      {/* Contact Information */}
      {(job.company_contact_email || job.company_contact_phone) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Contact Information</h3>
          <div className="space-y-2">
            {job.company_contact_email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`mailto:${job.company_contact_email}`}
                  className="text-primary hover:underline"
                >
                  {job.company_contact_email}
                </a>
              </div>
            )}
            {job.company_contact_phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`tel:${job.company_contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {job.company_contact_phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* AI Company Research */}
      <CompanyResearch jobId={job.id} />

      {!job.company_description && !job.company_size && !job.company_website && !companyResearch && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No company information available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add company details to help research this employer
          </p>
        </div>
      )}
    </div>
  );
}
