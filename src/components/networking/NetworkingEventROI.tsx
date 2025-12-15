import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Users, Briefcase, DollarSign, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function NetworkingEventROI() {
  const { data: roiData, isLoading } = useQuery({
    queryKey: ['networking-event-roi'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get networking events
      const { data: events, error: eventsError } = await supabase
        .from('networking_opportunities')
        .select('*')
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      // Get event connections
      const { data: connections, error: connectionsError } = await supabase
        .from('networking_event_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connectionsError) throw connectionsError;

      // Get campaign job links to track opportunities
      const { data: jobLinks, error: jobLinksError } = await supabase
        .from('campaign_job_links')
        .select('*')
        .eq('user_id', user.id);

      if (jobLinksError) throw jobLinksError;

      const allEvents = events || [];
      const allConnections = connections || [];
      const allJobLinks = jobLinks || [];

      // Calculate overall metrics
      const totalEvents = allEvents.length;
      const attendedEvents = allEvents.filter(e => e.attended_at !== null).length;
      const totalConnections = allConnections.length;
      const followUpsCompleted = allConnections.filter(c => c.follow_up_completed).length;
      
      // Calculate conversion rates
      const connectionRate = attendedEvents > 0 
        ? Math.round((totalConnections / attendedEvents) * 10) / 10
        : 0;

      const followUpRate = totalConnections > 0
        ? Math.round((followUpsCompleted / totalConnections) * 100)
        : 0;

      // Opportunities generated from networking
      const networkingOpportunities = allJobLinks.filter(link => 
        link.notes?.toLowerCase().includes('networking') ||
        link.notes?.toLowerCase().includes('referral') ||
        link.notes?.toLowerCase().includes('event')
      ).length;

      // Calculate ROI by event type
      const eventsByType: Record<string, {
        count: number;
        connections: number;
        followUps: number;
        opportunities: number;
      }> = {};

      allEvents.forEach(event => {
        const type = 'networking'; // Default type since networking_type doesn't exist
        if (!eventsByType[type]) {
          eventsByType[type] = { count: 0, connections: 0, followUps: 0, opportunities: 0 };
        }
        eventsByType[type].count++;

        // Count connections from this event
        const eventConnections = allConnections.filter(c => c.event_id === event.id);
        eventsByType[type].connections += eventConnections.length;
        eventsByType[type].followUps += eventConnections.filter(c => c.follow_up_completed).length;
      });

      const eventTypeChartData = Object.entries(eventsByType).map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        connections: data.connections,
        followUps: data.followUps,
        avgPerEvent: data.count > 0 ? Math.round((data.connections / data.count) * 10) / 10 : 0
      }));

      // Calculate monthly ROI trends
      const monthlyROI = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const eventsCount = allEvents.filter(e => {
          const eventDate = new Date(e.event_date);
          return eventDate >= monthStart && eventDate <= monthEnd && e.attended_at !== null;
        }).length;

        const connectionsCount = allConnections.filter(c => {
          const connDate = new Date(c.created_at);
          return connDate >= monthStart && connDate <= monthEnd;
        }).length;

        monthlyROI.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          events: eventsCount,
          connections: connectionsCount,
          roi: eventsCount > 0 ? Math.round((connectionsCount / eventsCount) * 10) / 10 : 0
        });
      }

      return {
        totalEvents,
        attendedEvents,
        totalConnections,
        followUpsCompleted,
        connectionRate,
        followUpRate,
        networkingOpportunities,
        eventTypeChartData,
        monthlyROI
      };
    }
  });

  if (isLoading) {
    return <Card><CardContent className="py-8 text-center">Loading event ROI data...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Networking Event ROI</h3>
        <p className="text-muted-foreground">Measure conversion rates and relationship outcomes from events</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiData?.attendedEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {roiData?.totalEvents || 0} total events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections Made</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiData?.totalConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              {roiData?.connectionRate || 0} per event avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-Up Rate</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiData?.followUpRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {roiData?.followUpsCompleted || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiData?.networkingOpportunities || 0}</div>
            <p className="text-xs text-muted-foreground">From networking</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Type Performance */}
      {roiData?.eventTypeChartData && roiData.eventTypeChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ROI by Event Type</CardTitle>
            <CardDescription>Compare networking effectiveness across different event formats</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roiData.eventTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="connections" fill="hsl(217 91% 60%)" name="Connections" />
                <Bar dataKey="followUps" fill="hsl(142 76% 36%)" name="Follow-Ups" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly ROI Trends */}
      {roiData?.monthlyROI && roiData.monthlyROI.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Networking ROI Trends (6 Months)</CardTitle>
            <CardDescription>Track events attended vs connections made over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roiData.monthlyROI}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="events" fill="hsl(280 85% 60%)" name="Events Attended" />
                <Bar dataKey="connections" fill="hsl(142 76% 36%)" name="Connections Made" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {roiData?.totalEvents === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No Networking Events Tracked</p>
            <p className="text-sm">Add networking events to see ROI analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
