import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, BarChart3, Upload, Palette, Shield, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { CohortManagement } from "@/components/enterprise/CohortManagement";
import { ProgramAnalytics } from "@/components/enterprise/ProgramAnalytics";
import { BulkOnboarding } from "@/components/enterprise/BulkOnboarding";
import { BrandingSettings } from "@/components/enterprise/BrandingSettings";
import { ComplianceAudit } from "@/components/enterprise/ComplianceAudit";
import { ROIReporting } from "@/components/enterprise/ROIReporting";
import { OrganizationOverview } from "@/components/enterprise/OrganizationOverview";
import { CreateOrganizationDialog } from "@/components/enterprise/CreateOrganizationDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function EnterpriseDashboard() {
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get all organizations
  const { data: allOrganizations } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_services_organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Get organizations user is admin of
  const { data: adminOrgs } = useQuery({
    queryKey: ['organization-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_admins')
        .select('organization_id, admin_role')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const adminOrgIds = new Set(adminOrgs?.map(a => a.organization_id) || []);
  const organizations = allOrganizations || [];
  const selectedOrg = selectedOrgId 
    ? organizations.find(o => o?.id === selectedOrgId) 
    : null;
  const isAdminOfSelected = selectedOrgId ? adminOrgIds.has(selectedOrgId) : false;

  const getOrgTypeBadge = (type: string) => {
    const types: Record<string, { label: string; emoji: string }> = {
      university: { label: "University", emoji: "🎓" },
      bootcamp: { label: "Bootcamp", emoji: "💻" },
      staffing_agency: { label: "Staffing", emoji: "🏢" },
      nonprofit: { label: "Nonprofit", emoji: "❤️" },
      corporate: { label: "Corporate", emoji: "🏛️" },
    };
    return types[type] || { label: type, emoji: "📋" };
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              Enterprise Career Services
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage job seeker cohorts, track program effectiveness, and generate ROI reports
            </p>
          </div>
          <Button onClick={() => setCreateOrgOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>

        {/* Organization Selection View */}
        {!selectedOrg ? (
          <div className="space-y-6">
            {/* Organizations List */}
            {organizations.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Organizations</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {organizations.map((org) => {
                    if (!org) return null;
                    const typeInfo = getOrgTypeBadge(org.organization_type);
                    const isAdmin = adminOrgIds.has(org.id);
                    return (
                      <Card 
                        key={org.id} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedOrgId(org.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{org.organization_name}</CardTitle>
                              <CardDescription className="mt-1">
                                {org.contact_email}
                              </CardDescription>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">
                              {typeInfo.emoji} {typeInfo.label}
                            </Badge>
                            {org.subscription_tier && (
                              <Badge variant="outline">{org.subscription_tier}</Badge>
                            )}
                            {isAdmin && (
                              <Badge variant="default">Admin</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No Organization Yet</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Create an organization to start managing cohorts of job seekers, 
                  track program effectiveness, and generate ROI reports.
                </p>
                <Button size="lg" onClick={() => setCreateOrgOpen(true)}>
                  <Building2 className="h-5 w-5 mr-2" />
                  Get Started
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Organization Detail View */
          <div className="space-y-6">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => setSelectedOrgId(null)}
              className="mb-4"
            >
              ← Back to Organizations
            </Button>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className={`grid w-full lg:w-auto lg:inline-grid ${isAdminOfSelected ? 'grid-cols-7' : 'grid-cols-1'}`}>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                {isAdminOfSelected && (
                  <>
                    <TabsTrigger value="cohorts" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Cohorts</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger value="onboarding" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Onboarding</span>
                    </TabsTrigger>
                    <TabsTrigger value="roi" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">ROI</span>
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <span className="hidden sm:inline">Branding</span>
                    </TabsTrigger>
                    <TabsTrigger value="compliance" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">Compliance</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="overview">
                <OrganizationOverview organization={selectedOrg} />
              </TabsContent>

              {isAdminOfSelected && (
                <>
                  <TabsContent value="cohorts">
                    <CohortManagement organizationId={selectedOrg?.id} />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <ProgramAnalytics organizationId={selectedOrg?.id} />
                  </TabsContent>

                  <TabsContent value="onboarding">
                    <BulkOnboarding organizationId={selectedOrg?.id} />
                  </TabsContent>

                  <TabsContent value="roi">
                    <ROIReporting organizationId={selectedOrg?.id} />
                  </TabsContent>

                  <TabsContent value="branding">
                    <BrandingSettings organizationId={selectedOrg?.id} />
                  </TabsContent>

                  <TabsContent value="compliance">
                    <ComplianceAudit organizationId={selectedOrg?.id} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}

        <CreateOrganizationDialog
          open={createOrgOpen}
          onOpenChange={setCreateOrgOpen}
        />
      </main>
    </div>
  );
}
