import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Shield, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function GmailIntegrationCard() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: integration, isLoading } = useQuery({
    queryKey: ["gmail-integration"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("gmail_integrations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Check for OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailSuccess = params.get("gmail_success");
    const gmailError = params.get("gmail_error");

    if (gmailSuccess) {
      toast.success("Gmail connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gmailError) {
      toast.error(`Failed to connect Gmail: ${gmailError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("gmail-oauth-start", {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      toast.error("Failed to start Gmail connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("gmail_integrations")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      // Also delete stored emails
      await supabase
        .from("application_emails")
        .delete()
        .eq("user_id", user.id);

      toast.success("Gmail disconnected");
      queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
      queryClient.invalidateQueries({ queryKey: ["application-emails"] });
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      toast.error("Failed to disconnect Gmail");
    }
  };

  const updateSettings = useMutation({
    mutationFn: async (updates: { scanning_enabled?: boolean; scan_frequency?: "hourly" | "daily" | "manual"; auto_import_enabled?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("gmail_integrations")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-integration"] });
      toast.success("Settings updated");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const scanEmails = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-gmail-emails");

      if (error) throw error;

      const importResults = data.autoImportResults || {};
      let message = `Scanned ${data.scanned} emails, found ${data.newEmails} new job-related emails`;
      
      if (importResults.autoImported > 0) {
        message += `. Auto-imported ${importResults.autoImported} applications`;
      }
      if (importResults.consolidated > 0) {
        message += `. Consolidated ${importResults.consolidated} duplicates`;
      }
      if (importResults.pendingReview > 0) {
        message += `. ${importResults.pendingReview} pending review`;
      }

      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["application-emails"] });
      queryClient.invalidateQueries({ queryKey: ["platform-applications"] });
      queryClient.invalidateQueries({ queryKey: ["pending-imports-count"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    } catch (error: any) {
      console.error("Error scanning emails:", error);
      toast.error(error.message || "Failed to scan emails");
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Gmail Integration</CardTitle>
          </div>
          {integration && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your Gmail to automatically track job application emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Privacy First</p>
                <p className="text-muted-foreground">
                  We use read-only access to scan for job-related emails. Your emails are never stored 
                  permanently and you can disconnect at any time.
                </p>
              </div>
            </div>
            <Button onClick={connectGmail} disabled={isConnecting} className="w-full">
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{integration.gmail_email}</p>
                <p className="text-sm text-muted-foreground">
                  Last scanned: {integration.last_scan_at 
                    ? new Date(integration.last_scan_at).toLocaleString() 
                    : "Never"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectGmail}>
                Disconnect
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Scanning</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically scan for job-related emails
                </p>
              </div>
              <Switch
                checked={integration.scanning_enabled || false}
                onCheckedChange={(checked) => updateSettings.mutate({ scanning_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Import Applications</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically import detected applications from LinkedIn, Indeed, etc.
                </p>
              </div>
              <Switch
                checked={integration.auto_import_enabled || false}
                onCheckedChange={(checked) => updateSettings.mutate({ auto_import_enabled: checked })}
                disabled={!integration.scanning_enabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Scan Frequency</Label>
              <Select
                value={integration.scan_frequency || "daily"}
                onValueChange={(value) => updateSettings.mutate({ scan_frequency: value as "hourly" | "daily" | "manual" })}
                disabled={!integration.scanning_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={scanEmails} 
              disabled={isScanning || !integration.scanning_enabled}
              variant="outline"
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan Now
                </>
              )}
            </Button>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>
                Emails are scanned for job-related keywords. Only relevant emails are stored.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
