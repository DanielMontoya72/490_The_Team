import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, TestTube2, Linkedin, FileText, Building2 } from "lucide-react";

const SAMPLE_EMAILS = {
  linkedin: {
    fromEmail: "jobs-noreply@linkedin.com",
    subject: "Your application was sent to Google",
    body: "You applied for Software Engineer at Google. Location: Mountain View, CA. Your application was sent to the hiring team."
  },
  indeed: {
    fromEmail: "no-reply@indeed.com", 
    subject: "Application Submitted: Product Manager at Amazon",
    body: "You've successfully applied for Product Manager at Amazon. Location: Seattle, WA. Keep track of your applications."
  },
  glassdoor: {
    fromEmail: "notifications@glassdoor.com",
    subject: "Application Confirmation",
    body: "You applied for position: UX Designer at Meta. Location: Menlo Park, CA. Good luck with your application!"
  }
};

const PLATFORM_ICONS = {
  linkedin: <Linkedin className="h-4 w-4" />,
  indeed: <FileText className="h-4 w-4" />,
  glassdoor: <Building2 className="h-4 w-4" />
};

export function TestPlatformImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<"linkedin" | "indeed" | "glassdoor">("linkedin");
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const queryClient = useQueryClient();

  const handleTestImport = async () => {
    setIsLoading(true);
    try {
      const sample = SAMPLE_EMAILS[platform];
      
      // Use custom values if provided
      let body = sample.body;
      let subject = sample.subject;
      
      if (customJobTitle && customCompany) {
        if (platform === "linkedin") {
          subject = `Your application was sent to ${customCompany}`;
          body = `You applied for ${customJobTitle} at ${customCompany}. Your application was sent to the hiring team.`;
        } else if (platform === "indeed") {
          subject = `Application Submitted: ${customJobTitle} at ${customCompany}`;
          body = `You've successfully applied for ${customJobTitle} at ${customCompany}. Keep track of your applications.`;
        } else {
          subject = `Application Confirmation`;
          body = `You applied for position: ${customJobTitle} at ${customCompany}. Good luck with your application!`;
        }
      }

      const { data, error } = await supabase.functions.invoke("parse-platform-email", {
        body: {
          fromEmail: sample.fromEmail,
          subject,
          body,
          rawContent: body
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.action === "pending_review") {
          toast.success(`Created pending import for ${data.platform}: ${data.extractedDetails?.jobTitle} at ${data.extractedDetails?.company}`);
        } else if (data.action === "merged_with_existing") {
          toast.success(`Consolidated with existing job (detected duplicate)`);
        } else if (data.action === "created") {
          toast.success(`Created new application from ${data.platform}`);
        }

        // Refresh all relevant queries
        queryClient.invalidateQueries({ queryKey: ["platform-applications"] });
        queryClient.invalidateQueries({ queryKey: ["pending-imports-count"] });
        queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      } else {
        toast.error(data.error || "Failed to parse email");
      }
    } catch (error: any) {
      console.error("Test import error:", error);
      toast.error(error.message || "Failed to test import");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube2 className="h-5 w-5" />
          Test Platform Import
        </CardTitle>
        <CardDescription>
          Simulate receiving an application confirmation email to test the auto-import flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-500" />
                    LinkedIn
                  </div>
                </SelectItem>
                <SelectItem value="indeed">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Indeed
                  </div>
                </SelectItem>
                <SelectItem value="glassdoor">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-500" />
                    Glassdoor
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Custom Job Title (optional)</Label>
            <Input 
              placeholder="e.g., Senior Developer"
              value={customJobTitle}
              onChange={(e) => setCustomJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Company (optional)</Label>
            <Input 
              placeholder="e.g., Apple"
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">Sample Email Preview:</p>
          <p className="text-muted-foreground">
            <strong>From:</strong> {SAMPLE_EMAILS[platform].fromEmail}
          </p>
          <p className="text-muted-foreground">
            <strong>Subject:</strong> {customJobTitle && customCompany 
              ? (platform === "linkedin" 
                  ? `Your application was sent to ${customCompany}`
                  : platform === "indeed"
                    ? `Application Submitted: ${customJobTitle} at ${customCompany}`
                    : "Application Confirmation")
              : SAMPLE_EMAILS[platform].subject}
          </p>
        </div>

        <Button 
          onClick={handleTestImport} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulating Import...
            </>
          ) : (
            <>
              {PLATFORM_ICONS[platform]}
              <span className="ml-2">Test {platform.charAt(0).toUpperCase() + platform.slice(1)} Import</span>
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This simulates receiving an email from {platform}. The application will be created as a pending import or auto-imported based on your settings.
        </p>
      </CardContent>
    </Card>
  );
}