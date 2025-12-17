import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Linkedin, 
  FileText, 
  Building2, 
  Globe, 
  RefreshCw,
  TestTube2,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { PendingImportsTable } from "./PendingImportsTable";
import { PlatformApplicationsList } from "./PlatformApplicationsList";
import { ManualPlatformEntry } from "./ManualPlatformEntry";
import { ApplicationGapsDetector } from "./ApplicationGapsDetector";
import { ExportApplicationHistory } from "./ExportApplicationHistory";
import { TestPlatformImport } from "./TestPlatformImport";
import { ScannedEmailsList } from "./ScannedEmailsList";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  indeed: <FileText className="h-4 w-4" />,
  glassdoor: <Building2 className="h-4 w-4" />,
  ziprecruiter: <Globe className="h-4 w-4" />,
  company_site: <Building2 className="h-4 w-4" />,
  other: <Globe className="h-4 w-4" />
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-blue-500",
  indeed: "bg-purple-500",
  glassdoor: "bg-green-500",
  ziprecruiter: "bg-orange-500",
  company_site: "bg-gray-500",
  other: "bg-muted"
};

export function PlatformTrackingDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: gmailIntegration } = useQuery({
    queryKey: ["gmail-integration"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("gmail_integrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    }
  });

  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: platforms } = await supabase
        .from("application_platforms")
        .select("platform_name, platform_status, is_primary")
        .eq("user_id", user.id);

      const stats: Record<string, { total: number; primary: number }> = {};
      platforms?.forEach(p => {
        if (!stats[p.platform_name]) stats[p.platform_name] = { total: 0, primary: 0 };
        stats[p.platform_name].total++;
        if (p.is_primary) stats[p.platform_name].primary++;
      });
      return stats;
    }
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-imports-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from("pending_application_imports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      return count || 0;
    }
  });

  const scanEmails = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-gmail-emails");

      if (error) throw error;

      const importResults = data.autoImportResults || {};
      let message = `Scanned ${data.scanned} emails, found ${data.newEmails} new job-related emails`;
      
      if (importResults.pendingReview > 0) {
        message += `. ${importResults.pendingReview} pending review`;
        setActiveTab("pending"); // Auto-switch to pending tab
      }
      if (importResults.consolidated > 0) {
        message += `. Consolidated ${importResults.consolidated} duplicates`;
      }

      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["scanned-emails"] });
      queryClient.invalidateQueries({ queryKey: ["platform-applications"] });
      queryClient.invalidateQueries({ queryKey: ["pending-imports-count"] });
      queryClient.invalidateQueries({ queryKey: ["pending-imports"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    } catch (error: any) {
      console.error("Error scanning emails:", error);
      toast.error(error.message || "Failed to scan emails");
    } finally {
      setIsScanning(false);
    }
  };

  const totalApplications = Object.values(platformStats || {}).reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Multi-Platform Tracking</h2>
          <p className="text-muted-foreground">Track applications across LinkedIn, Indeed, Glassdoor, and more</p>
        </div>
        <div className="flex gap-2">
          <ExportApplicationHistory />
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["platform"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {/* Gmail Scan Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Email Scanning</h3>
                  {gmailIntegration ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {gmailIntegration 
                    ? `Scan your Gmail for job applications from LinkedIn, Indeed, Glassdoor` 
                    : "Connect Gmail to auto-import job applications"}
                </p>
              </div>
            </div>
            {gmailIntegration ? (
              <Button 
                onClick={scanEmails} 
                disabled={isScanning || !gmailIntegration.scanning_enabled}
                className="shrink-0"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Scan Emails Now
                  </>
                )}
              </Button>
            ) : (
              <Button asChild className="shrink-0">
                <Link to="/profile">
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail
                </Link>
              </Button>
            )}
          </div>
          {gmailIntegration && !gmailIntegration.scanning_enabled && (
            <p className="text-xs text-yellow-600 mt-2">
              Email scanning is disabled. <Link to="/profile" className="underline">Enable it in Profile settings</Link>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">Across {Object.keys(platformStats || {}).length} platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Imports</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {pendingCount || 0}
              {(pendingCount || 0) > 0 && <Badge variant="destructive">Review</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Platform</CardTitle></CardHeader>
          <CardContent>
            {platformStats && Object.keys(platformStats).length > 0 ? (
              <div className="text-2xl font-bold capitalize flex items-center gap-2">
                {PLATFORM_ICONS[Object.entries(platformStats).sort((a, b) => b[1].total - a[1].total)[0]?.[0]]}
                {Object.entries(platformStats).sort((a, b) => b[1].total - a[1].total)[0]?.[0]?.replace("_", " ")}
              </div>
            ) : <div className="text-muted-foreground">No data yet</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Platform Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(platformStats || {}).map(([platform, stats]) => (
              <div key={platform} className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
                <div className={`p-1.5 rounded ${PLATFORM_COLORS[platform] || PLATFORM_COLORS.other}`}>
                  {PLATFORM_ICONS[platform] || PLATFORM_ICONS.other}
                </div>
                <div>
                  <p className="font-medium capitalize">{platform.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{stats.total} applications</p>
                </div>
              </div>
            ))}
            {Object.keys(platformStats || {}).length === 0 && <p className="text-muted-foreground">No platform data yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">All Applications</TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Scanned Emails
          </TabsTrigger>
          <TabsTrigger value="pending">Pending{(pendingCount || 0) > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="gaps">Gap Detection</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-1">
            <TestTube2 className="h-3 w-3" />
            Test Import
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><PlatformApplicationsList /></TabsContent>
        <TabsContent value="emails" className="mt-4"><ScannedEmailsList /></TabsContent>
        <TabsContent value="pending" className="mt-4"><PendingImportsTable /></TabsContent>
        <TabsContent value="gaps" className="mt-4"><ApplicationGapsDetector /></TabsContent>
        <TabsContent value="manual" className="mt-4"><ManualPlatformEntry /></TabsContent>
        <TabsContent value="test" className="mt-4"><TestPlatformImport /></TabsContent>
      </Tabs>
    </div>
  );
}
