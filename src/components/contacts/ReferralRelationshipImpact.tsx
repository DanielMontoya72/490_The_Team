import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertCircle, Heart } from "lucide-react";

export function ReferralRelationshipImpact() {
  const { data: impactData, isLoading } = useQuery({
    queryKey: ['referral-relationship-impact'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch referral requests with contact info
      const { data: requests, error } = await supabase
        .from('referral_requests')
        .select(`
          *,
          professional_contacts (
            id,
            first_name,
            last_name,
            relationship_strength,
            last_contacted_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by contact and analyze impact
      const contactMap = new Map();
      requests?.forEach(request => {
        const contact = request.professional_contacts;
        if (!contact) return;

        if (!contactMap.has(contact.id)) {
          contactMap.set(contact.id, {
            contact,
            requests: [],
            totalRequests: 0,
            successful: 0,
            pending: 0,
            lastRequestDate: null,
          });
        }

        const entry = contactMap.get(contact.id);
        entry.requests.push(request);
        entry.totalRequests++;
        if (request.status === 'successful') entry.successful++;
        if (request.status === 'sent') entry.pending++;
        
        const requestDate = new Date(request.created_at);
        if (!entry.lastRequestDate || requestDate > entry.lastRequestDate) {
          entry.lastRequestDate = requestDate;
        }
      });

      // Convert to array and calculate health scores
      const contacts = Array.from(contactMap.values()).map(entry => {
        const daysSinceLastRequest = entry.lastRequestDate 
          ? Math.floor((Date.now() - entry.lastRequestDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Health assessment
        let health: 'good' | 'moderate' | 'at-risk' = 'good';
        let healthReason = '';

        if (entry.totalRequests > 3 && entry.successful === 0) {
          health = 'at-risk';
          healthReason = 'Multiple requests with no success';
        } else if (daysSinceLastRequest !== null && daysSinceLastRequest < 90 && entry.totalRequests > 1) {
          health = 'at-risk';
          healthReason = 'Too many requests too quickly';
        } else if (entry.pending > 0 && daysSinceLastRequest !== null && daysSinceLastRequest > 30) {
          health = 'moderate';
          healthReason = 'Pending request needs follow-up';
        } else if (entry.successful > 0) {
          health = 'good';
          healthReason = 'Successful referral history';
        }

        return {
          ...entry,
          daysSinceLastRequest,
          health,
          healthReason,
        };
      });

      // Sort by health priority (at-risk first)
      contacts.sort((a, b) => {
        const healthOrder = { 'at-risk': 0, 'moderate': 1, 'good': 2 };
        return healthOrder[a.health] - healthOrder[b.health];
      });

      return contacts;
    },
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading relationship data...</CardContent></Card>;
  }

  const atRiskCount = impactData?.filter(c => c.health === 'at-risk').length || 0;
  const goodCount = impactData?.filter(c => c.health === 'good').length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Relationship Health & Impact
        </CardTitle>
        <CardDescription>
          Monitor how referral requests affect your professional relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{goodCount}</p>
            <p className="text-xs text-muted-foreground">Healthy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {impactData?.filter(c => c.health === 'moderate').length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </div>
        </div>

        {(!impactData || impactData.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No referral relationship data yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {impactData.map((contact) => (
              <div 
                key={contact.contact.id} 
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      {contact.contact.first_name} {contact.contact.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {contact.totalRequests} request{contact.totalRequests !== 1 ? 's' : ''} • 
                      {contact.successful > 0 && ` ${contact.successful} successful`}
                      {contact.pending > 0 && ` • ${contact.pending} pending`}
                    </p>
                  </div>
                  <Badge 
                    variant={contact.health === 'good' ? 'default' : contact.health === 'moderate' ? 'secondary' : 'destructive'}
                    className="shrink-0"
                  >
                    {contact.health === 'good' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {contact.health === 'at-risk' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {contact.health}
                  </Badge>
                </div>
                
                {contact.healthReason && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    {contact.healthReason}
                  </p>
                )}

                {contact.daysSinceLastRequest !== null && (
                  <p className="text-xs text-muted-foreground">
                    Last request: {contact.daysSinceLastRequest} days ago
                    {contact.daysSinceLastRequest < 90 && contact.totalRequests > 1 && (
                      <span className="text-yellow-600 ml-1">(Consider waiting before next request)</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
