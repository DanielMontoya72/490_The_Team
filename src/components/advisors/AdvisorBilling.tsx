import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorBillingProps {
  advisors: any[];
}

export function AdvisorBilling({ advisors }: AdvisorBillingProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingSessions();
  }, []);

  const fetchBillingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_sessions")
        .select("*, external_advisors(advisor_name, hourly_rate)")
        .not("amount_charged", "is", null)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching billing:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("advisor_sessions")
        .update({ payment_status: "paid" })
        .eq("id", sessionId);

      if (error) throw error;
      toast.success("Payment marked as complete");
      fetchBillingSessions();
    } catch (error: any) {
      toast.error("Failed to update payment status");
    }
  };

  const totalPending = sessions
    .filter(s => s.payment_status === 'pending' && s.status === 'completed')
    .reduce((sum, s) => sum + (s.amount_charged || 0), 0);

  const totalPaid = sessions
    .filter(s => s.payment_status === 'paid')
    .reduce((sum, s) => sum + (s.amount_charged || 0), 0);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/10 text-green-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "waived": return "bg-blue-500/10 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Billing & Payments</h3>
        <p className="text-sm text-muted-foreground">Track coaching session payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>Track payments for coaching sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billable sessions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{session.external_advisors?.advisor_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.session_type.replace('_', ' ')} • {format(new Date(session.scheduled_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">${session.amount_charged?.toFixed(2)}</p>
                    <Badge className={getPaymentStatusColor(session.payment_status)}>
                      {session.payment_status}
                    </Badge>
                    {session.payment_status === 'pending' && session.status === 'completed' && (
                      <Button variant="outline" size="sm" onClick={() => markAsPaid(session.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
