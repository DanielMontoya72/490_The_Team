import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export function ExportApplicationHistory() {
  const [isExporting, setIsExporting] = useState(false);

  const { data: applications } = useQuery({
    queryKey: ["export-applications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          job_title,
          company_name,
          location,
          status,
          created_at,
          updated_at,
          primary_platform,
          platform_count,
          job_url,
          salary_range_min,
          salary_range_max,
          notes,
          application_platforms (
            platform_name,
            platform_status,
            is_primary,
            applied_via_url,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const exportToCSV = () => {
    if (!applications?.length) {
      toast.error("No applications to export");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Job Title",
        "Company",
        "Location",
        "Status",
        "Primary Platform",
        "All Platforms",
        "Platform Count",
        "Salary Min",
        "Salary Max",
        "Job URL",
        "Applied Date",
        "Last Updated",
        "Notes"
      ];

      const rows = applications.map(app => [
        app.job_title || "",
        app.company_name || "",
        app.location || "",
        app.status || "",
        app.primary_platform || "",
        (app.application_platforms as any[])?.map(p => p.platform_name).join("; ") || "",
        app.platform_count || 1,
        app.salary_range_min || "",
        app.salary_range_max || "",
        app.job_url || "",
        app.created_at ? format(new Date(app.created_at), "yyyy-MM-dd") : "",
        app.updated_at ? format(new Date(app.updated_at), "yyyy-MM-dd") : "",
        (app.notes || "").replace(/"/g, '""')
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `application-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast.success("Export complete!");
    } catch (error) {
      toast.error("Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!applications?.length) {
      toast.error("No applications to export");
      return;
    }

    setIsExporting(true);

    try {
      const exportData = applications.map(app => ({
        jobTitle: app.job_title,
        company: app.company_name,
        location: app.location,
        status: app.status,
        primaryPlatform: app.primary_platform,
        platforms: (app.application_platforms as any[])?.map(p => ({
          name: p.platform_name,
          status: p.platform_status,
          isPrimary: p.is_primary
        })) || [],
        platformCount: app.platform_count,
        salaryRange: {
          min: app.salary_range_min,
          max: app.salary_range_max
        },
        jobUrl: app.job_url,
        appliedDate: app.created_at,
        lastUpdated: app.updated_at,
        notes: app.notes
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `application-history-${format(new Date(), "yyyy-MM-dd")}.json`;
      link.click();

      toast.success("Export complete!");
    } catch (error) {
      toast.error("Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>Export as JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
