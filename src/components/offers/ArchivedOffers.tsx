import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, RotateCcw, Trash2, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ArchivedOffer {
  id: string;
  company_name: string;
  position_title: string;
  location: string | null;
  base_salary: number;
  total_compensation: number | null;
  status: string;
  decline_reason: string | null;
  decision_date: string | null;
  created_at: string;
}

export function ArchivedOffers() {
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['job-offers', 'archived'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['declined', 'expired'])
        .order('decision_date', { ascending: false });

      if (error) throw error;
      return data as ArchivedOffer[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_offers')
        .update({ status: 'active', decline_reason: null, decision_date: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
      toast.success('Offer restored');
    },
    onError: () => toast.error('Failed to restore offer'),
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
      toast.success('Offer permanently deleted');
    },
    onError: () => toast.error('Failed to delete offer'),
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
    </div>;
  }

  if (!offers || offers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Archive className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No archived offers</p>
          <p className="text-sm text-muted-foreground mt-1">
            Declined or expired offers will appear here for future reference
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Archived Offers ({offers.length})</h2>
      </div>

      <div className="grid gap-4">
        {offers.map((offer) => (
          <Card key={offer.id} className="opacity-75 hover:opacity-100 transition-opacity">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{offer.company_name}</span>
                    {getStatusBadge(offer.status)}
                  </div>
                  <CardTitle className="text-lg">{offer.position_title}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => restoreMutation.mutate(offer.id)}
                    title="Restore offer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteMutation.mutate(offer.id)}
                    className="text-destructive"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base: </span>
                    <span className="font-medium">{formatCurrency(offer.base_salary)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">{formatCurrency(offer.total_compensation)}</span>
                  </div>
                  {offer.decision_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(offer.decision_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                {offer.decline_reason && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Reason for declining:</p>
                    <p className="text-sm">{offer.decline_reason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
