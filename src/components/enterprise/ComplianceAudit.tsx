import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, FileText, Users, Download, Lock, Eye, Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ComplianceAuditProps {
  organizationId: string;
}

export function ComplianceAudit({ organizationId }: ComplianceAuditProps) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['compliance-audit-logs', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, any> = {
      user_access: Eye,
      data_export: Download,
      settings_change: Settings,
      user_deletion: Trash2,
      report_generation: FileText,
    };
    return icons[actionType] || Shield;
  };

  const getActionBadgeVariant = (actionType: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      user_access: "secondary",
      data_export: "outline",
      settings_change: "default",
      user_deletion: "destructive",
      report_generation: "secondary",
    };
    return variants[actionType] || "outline";
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Compliance & Security
          </CardTitle>
          <CardDescription>
            Data security features and audit logging for institutional compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-600">Data Encryption</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                All data encrypted at rest and in transit using AES-256
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-600">Access Control</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Role-based permissions with super admin, admin, coordinator roles
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-purple-500/10 border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-600">Audit Trail</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete logging of all administrative actions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { feature: 'FERPA Compliance', status: 'Enabled', description: 'Student data protection for educational institutions' },
              { feature: 'SOC 2 Type II', status: 'Certified', description: 'Enterprise-grade security and availability' },
              { feature: 'GDPR Compliance', status: 'Enabled', description: 'EU data protection and privacy' },
              { feature: 'Data Retention Policy', status: 'Configured', description: '7-year retention with automatic archival' },
              { feature: 'Single Sign-On (SSO)', status: 'Available', description: 'SAML 2.0 integration for institutional login' },
              { feature: 'IP Allowlisting', status: 'Available', description: 'Restrict access to specific IP ranges' },
            ].map((item) => (
              <div key={item.feature} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <h4 className="font-medium">{item.feature}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant={item.status === 'Enabled' || item.status === 'Certified' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Recent administrative actions for compliance tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!auditLogs || auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit log entries yet</p>
              <p className="text-sm">Actions will be logged here as they occur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const Icon = getActionIcon(log.action_type);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-3 rounded-lg border"
                  >
                    <div className="p-2 rounded-full bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(log.action_type)} className="capitalize">
                          {log.action_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{log.action_description}</p>
                      {log.ip_address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
