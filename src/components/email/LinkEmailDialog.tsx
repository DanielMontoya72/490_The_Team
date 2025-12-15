import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Link2, Search, CheckCircle2, AlertTriangle, Sparkles, UserCheck, RefreshCw, Loader2, Building2, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LinkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  unlinkedEmails: any[];
}

const emailTypeConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  interview_invitation: { label: "Interview", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Sparkles },
  offer: { label: "Offer", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  rejection: { label: "Rejection", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle },
  recruiter_outreach: { label: "Recruiter", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: UserCheck },
  status_update: { label: "Update", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: RefreshCw },
  follow_up: { label: "Follow-up", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Mail },
  other: { label: "Other", color: "bg-muted text-muted-foreground", icon: Mail },
};

export function LinkEmailDialog({ 
  open, 
  onOpenChange, 
  jobId, 
  jobTitle, 
  companyName,
  unlinkedEmails 
}: LinkEmailDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [filterByCurrentJob, setFilterByCurrentJob] = useState(true);
  const queryClient = useQueryClient();

  const linkEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("application_emails")
        .update({ job_id: jobId })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email linked to job");
      queryClient.invalidateQueries({ queryKey: ["job-emails", jobId] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-emails"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-emails-sidebar"] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to link email");
    },
  });

  // Check if email matches company name
  const emailMatchesCompany = (email: any, company: string): boolean => {
    if (!company) return true;
    const companyLower = company.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(companyLower) ||
      email.from_email?.toLowerCase().includes(companyLower) ||
      email.from_name?.toLowerCase().includes(companyLower) ||
      email.snippet?.toLowerCase().includes(companyLower)
    );
  };

  // Check if email matches job title keywords
  const emailMatchesJobTitle = (email: any, title: string): boolean => {
    if (!title) return true;
    const keywords = title.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    if (keywords.length === 0) return true;
    return keywords.some(keyword =>
      email.subject?.toLowerCase().includes(keyword) ||
      email.snippet?.toLowerCase().includes(keyword)
    );
  };

  const { suggestedEmails, allFilteredEmails } = useMemo(() => {
    const suggested: any[] = [];
    const all: any[] = [];

    unlinkedEmails.forEach((email) => {
      // Apply search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          email.subject?.toLowerCase().includes(query) ||
          email.from_email?.toLowerCase().includes(query) ||
          email.from_name?.toLowerCase().includes(query) ||
          email.snippet?.toLowerCase().includes(query);
        if (!matches) return;
      }

      // Apply company filter (from input or current job)
      const companyToMatch = companyFilter || (filterByCurrentJob ? companyName : "");
      if (companyToMatch && !emailMatchesCompany(email, companyToMatch)) {
        if (filterByCurrentJob || companyFilter) return;
      }

      // Apply job title filter (from input or current job)
      const titleToMatch = jobTitleFilter || (filterByCurrentJob ? jobTitle : "");
      if (titleToMatch && !emailMatchesJobTitle(email, titleToMatch)) {
        if (filterByCurrentJob || jobTitleFilter) return;
      }

      // Check if it's a suggested match (matches current job)
      const matchesCurrentCompany = companyName && emailMatchesCompany(email, companyName);
      const matchesCurrentTitle = jobTitle && emailMatchesJobTitle(email, jobTitle);
      
      if (matchesCurrentCompany || matchesCurrentTitle) {
        suggested.push({ ...email, isMatch: true });
      }
      
      all.push({ ...email, isMatch: matchesCurrentCompany || matchesCurrentTitle });
    });

    return { suggestedEmails: suggested, allFilteredEmails: all };
  }, [unlinkedEmails, searchQuery, companyFilter, jobTitleFilter, filterByCurrentJob, companyName, jobTitle]);

  // Highlight matching text
  const highlightMatch = (text: string | null, term?: string) => {
    if (!text || !term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">{part}</mark>
        : part
    );
  };

  const renderEmailList = (emails: any[]) => (
    <ScrollArea className="h-[350px]">
      <div className="space-y-2">
        {emails.map((email) => {
          const config = emailTypeConfig[email.email_type || "other"];
          const Icon = config.icon;

          return (
            <div
              key={email.id}
              className={cn(
                "p-3 border rounded-lg transition-colors cursor-pointer group",
                email.isMatch 
                  ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => linkEmailMutation.mutate(email.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {email.isMatch && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Match
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {email.received_at && format(new Date(email.received_at), "MMM d")}
                    </span>
                  </div>
                  <p className="font-medium text-sm truncate">
                    {companyName ? highlightMatch(email.subject, companyName) : email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {companyName ? highlightMatch(email.from_name || email.from_email, companyName) : (email.from_name || email.from_email)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={linkEmailMutation.isPending}
                >
                  {linkEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Email to Job
          </DialogTitle>
          <DialogDescription>
            {jobTitle && companyName 
              ? `Link an email to ${jobTitle} at ${companyName}`
              : "Select an email to link to this job application"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="suggested" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="suggested" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Suggested ({suggestedEmails.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              All Emails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggested" className="space-y-4">
            {companyName && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Showing emails that mention <strong>"{companyName}"</strong>
                  {jobTitle && <> or <strong>"{jobTitle}"</strong></>}
                </span>
              </div>
            )}

            {suggestedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">No matching emails found</p>
                <p className="text-sm text-muted-foreground">
                  No emails match this company or job title. Check the "All Emails" tab.
                </p>
              </div>
            ) : (
              renderEmailList(suggestedEmails)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search all emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by company..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by job title..."
                    value={jobTitleFilter}
                    onChange={(e) => setJobTitleFilter(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Auto-filter toggle */}
              {(companyName || jobTitle) && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-current"
                    checked={filterByCurrentJob}
                    onCheckedChange={setFilterByCurrentJob}
                  />
                  <Label htmlFor="filter-current" className="text-sm">
                    Only show emails matching this job
                  </Label>
                </div>
              )}
            </div>

            {unlinkedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">No unlinked emails found</p>
                <p className="text-sm text-muted-foreground">
                  Scan your Gmail inbox to find job-related emails
                </p>
              </div>
            ) : allFilteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">No matching emails</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              renderEmailList(allFilteredEmails)
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
