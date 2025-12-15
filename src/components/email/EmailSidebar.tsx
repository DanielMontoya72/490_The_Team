import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Mail, Link2, Search, X, ChevronRight, ChevronLeft, 
  CheckCircle2, AlertTriangle, Sparkles, UserCheck, RefreshCw, Loader2, Building2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailSidebarProps {
  jobId: string;
  companyName?: string;
  jobTitle?: string;
  isOpen: boolean;
  onToggle: () => void;
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

export function EmailSidebar({ jobId, companyName, jobTitle, isOpen, onToggle }: EmailSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByCompany, setFilterByCompany] = useState(true);
  const queryClient = useQueryClient();

  const { data: unlinkedEmails, isLoading } = useQuery({
    queryKey: ["unlinked-emails-sidebar"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("application_emails")
        .select("*")
        .eq("user_id", user.id)
        .is("job_id", null)
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["unlinked-emails-sidebar"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-emails"] });
    },
    onError: () => {
      toast.error("Failed to link email");
    },
  });

  // Check if email matches company name
  const emailMatchesCompany = (email: any): boolean => {
    if (!companyName) return false;
    const companyLower = companyName.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(companyLower) ||
      email.from_email?.toLowerCase().includes(companyLower) ||
      email.from_name?.toLowerCase().includes(companyLower) ||
      email.snippet?.toLowerCase().includes(companyLower)
    );
  };

  // Check if email matches job title
  const emailMatchesJobTitle = (email: any): boolean => {
    if (!jobTitle) return false;
    const titleLower = jobTitle.toLowerCase();
    // Split job title into keywords for partial matching
    const keywords = titleLower.split(/\s+/).filter(k => k.length > 2);
    return keywords.some(keyword =>
      email.subject?.toLowerCase().includes(keyword) ||
      email.snippet?.toLowerCase().includes(keyword)
    );
  };

  const { companyMatches, otherEmails } = useMemo(() => {
    if (!unlinkedEmails) return { companyMatches: [], otherEmails: [] };

    const filtered = unlinkedEmails.filter((email) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        email.subject?.toLowerCase().includes(query) ||
        email.from_email?.toLowerCase().includes(query) ||
        email.from_name?.toLowerCase().includes(query) ||
        email.snippet?.toLowerCase().includes(query)
      );
    });

    const matches: any[] = [];
    const others: any[] = [];

    filtered.forEach(email => {
      if (emailMatchesCompany(email) || emailMatchesJobTitle(email)) {
        matches.push(email);
      } else {
        others.push(email);
      }
    });

    return { companyMatches: matches, otherEmails: others };
  }, [unlinkedEmails, searchQuery, companyName, jobTitle]);

  const displayedEmails = filterByCompany && companyName 
    ? companyMatches 
    : [...companyMatches, ...otherEmails];

  // Highlight matching text
  const highlightMatch = (text: string | null) => {
    if (!text || !companyName) return text;
    const regex = new RegExp(`(${companyName})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === companyName.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">{part}</mark>
        : part
    );
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 h-24 w-8 flex-col gap-1 bg-background/95 border shadow-lg hover:bg-muted"
      >
        <Mail className="h-4 w-4" />
        <ChevronLeft className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="w-80 border-l bg-background/95 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Recent Emails</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="p-3 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        
        {companyName && (
          <div className="flex items-center justify-between">
            <Label htmlFor="filter-company" className="text-xs flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Filter by "{companyName}"
            </Label>
            <Switch
              id="filter-company"
              checked={filterByCompany}
              onCheckedChange={setFilterByCompany}
              className="scale-75"
            />
          </div>
        )}

        {companyMatches.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>{companyMatches.length} emails match this company</span>
          </div>
        )}
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : displayedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Mail className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No emails found</p>
            <p className="text-xs text-muted-foreground">
              {filterByCompany && companyName 
                ? `No emails matching "${companyName}"`
                : "Scan your Gmail to find emails"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {displayedEmails.map((email) => {
              const config = emailTypeConfig[email.email_type || "other"];
              const Icon = config.icon;
              const isMatch = emailMatchesCompany(email) || emailMatchesJobTitle(email);

              return (
                <div
                  key={email.id}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all cursor-pointer group",
                    isMatch 
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => linkEmailMutation.mutate(email.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                          <Icon className="h-2.5 w-2.5 mr-0.5" />
                          {config.label}
                        </Badge>
                        {isMatch && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                            Match
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-xs truncate">
                        {highlightMatch(email.subject)}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {highlightMatch(email.from_name || email.from_email)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {email.received_at && format(new Date(email.received_at), "MMM d")}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={linkEmailMutation.isPending}
                    >
                      {linkEmailMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
