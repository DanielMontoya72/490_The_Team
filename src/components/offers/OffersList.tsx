import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, DollarSign, MapPin, Building2, Scale, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AddOfferDialog } from "./AddOfferDialog";
import { EditOfferDialog } from "./EditOfferDialog";

interface JobOffer {
  id: string;
  job_id: string | null;
  company_name: string;
  position_title: string;
  location: string | null;
  remote_policy: string | null;
  base_salary: number;
  signing_bonus: number;
  annual_bonus_percent: number;
  equity_value: number;
  total_compensation: number | null;
  adjusted_compensation: number | null;
  status: string;
  offer_date: string | null;
  expiration_date: string | null;
}

interface OfferedJob {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  status: string;
}

export function OffersList() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const queryClient = useQueryClient();

  // Fetch existing offers
  const { data: offers, isLoading } = useQuery({
    queryKey: ['job-offers', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobOffer[];
    },
  });

  // Fetch jobs with offer status that aren't linked yet
  const { data: offeredJobs } = useQuery({
    queryKey: ['offered-jobs-unlinked'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all job_ids already in job_offers
      const { data: existingOffers } = await supabase
        .from('job_offers')
        .select('job_id')
        .eq('user_id', user.id)
        .not('job_id', 'is', null);

      const linkedJobIds = existingOffers?.map(o => o.job_id).filter(Boolean) || [];

      // Get jobs with offer statuses that aren't linked
      let query = supabase
        .from('jobs')
        .select('id, job_title, company_name, location, salary_range_min, salary_range_max, status')
        .eq('user_id', user.id)
        .in('status', ['Offer', 'Offer Received', 'Accepted']);

      if (linkedJobIds.length > 0) {
        query = query.not('id', 'in', `(${linkedJobIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OfferedJob[];
    },
  });

  // Auto-create offers for unlinked offered jobs
  const syncMutation = useMutation({
    mutationFn: async (job: OfferedJob) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const baseSalary = job.salary_range_max || job.salary_range_min || 0;

      const { error } = await supabase.from('job_offers').insert({
        user_id: user.id,
        job_id: job.id,
        company_name: job.company_name,
        position_title: job.job_title,
        location: job.location,
        base_salary: baseSalary,
        total_compensation: baseSalary,
        adjusted_compensation: baseSalary,
        status: job.status === 'Accepted' ? 'accepted' : 'active',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offered-jobs-unlinked'] });
      toast.success('Job synced to offers');
    },
    onError: () => toast.error('Failed to sync job'),
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      if (!offeredJobs?.length) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const inserts = offeredJobs.map(job => ({
        user_id: user.id,
        job_id: job.id,
        company_name: job.company_name,
        position_title: job.job_title,
        location: job.location,
        base_salary: job.salary_range_max || job.salary_range_min || 0,
        total_compensation: job.salary_range_max || job.salary_range_min || 0,
        adjusted_compensation: job.salary_range_max || job.salary_range_min || 0,
        status: job.status === 'Accepted' ? 'accepted' : 'active',
      }));

      const { error } = await supabase.from('job_offers').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offered-jobs-unlinked'] });
      toast.success('All offers synced');
    },
    onError: () => toast.error('Failed to sync offers'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_offers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offered-jobs-unlinked'] });
      toast.success('Offer deleted');
    },
    onError: () => toast.error('Failed to delete offer'),
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRemoteBadge = (policy: string | null) => {
    switch (policy) {
      case 'remote': return <Badge className="bg-green-100 text-green-800">Remote</Badge>;
      case 'hybrid': return <Badge className="bg-blue-100 text-blue-800">Hybrid</Badge>;
      case 'onsite': return <Badge className="bg-orange-100 text-orange-800">Onsite</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Unlinked Offered Jobs */}
      {offeredJobs && offeredJobs.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Jobs with Offers to Import ({offeredJobs.length})
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => syncAllMutation.mutate()}
                disabled={syncAllMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
                Sync All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offeredJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{job.job_title}</p>
                    <p className="text-sm text-muted-foreground">{job.company_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{job.status}</Badge>
                    {job.salary_range_max && (
                      <span className="text-sm">{formatCurrency(job.salary_range_max)}</span>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => syncMutation.mutate(job)}
                      disabled={syncMutation.isPending}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Offers */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Active Offers ({offers?.length || 0})</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offer
        </Button>
      </div>

      {offers?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No job offers to compare yet</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers?.map((offer) => (
            <Card key={offer.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{offer.company_name}</span>
                      {offer.job_id && (
                        <Badge variant="outline" className="text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          Linked
                        </Badge>
                      )}
                      {offer.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{offer.position_title}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingOffer(offer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(offer.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {offer.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {offer.location}
                      </div>
                    )}
                    {getRemoteBadge(offer.remote_policy)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Base Salary</p>
                      <p className="font-semibold flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(offer.base_salary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Compensation</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(offer.total_compensation)}
                      </p>
                    </div>
                  </div>

                  {(offer.signing_bonus > 0 || offer.equity_value > 0) && (
                    <div className="flex gap-2 flex-wrap">
                      {offer.signing_bonus > 0 && (
                        <Badge variant="outline">
                          Signing: {formatCurrency(offer.signing_bonus)}
                        </Badge>
                      )}
                      {offer.equity_value > 0 && (
                        <Badge variant="outline">
                          Equity: {formatCurrency(offer.equity_value)}
                        </Badge>
                      )}
                      {offer.annual_bonus_percent > 0 && (
                        <Badge variant="outline">
                          Bonus: {offer.annual_bonus_percent}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddOfferDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      {editingOffer && (
        <EditOfferDialog 
          offer={editingOffer} 
          open={!!editingOffer} 
          onOpenChange={(open) => !open && setEditingOffer(null)} 
        />
      )}
    </div>
  );
}