import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ResumeJobLinksProps {
  resumeId: string;
}

interface LinkedJob {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
}

export function ResumeJobLinks({ resumeId }: ResumeJobLinksProps) {
  const [linkedJobs, setLinkedJobs] = useState<LinkedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLinkedJobs();
  }, [resumeId]);

  const fetchLinkedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_application_materials")
        .select(`
          job_id,
          jobs!inner (
            id,
            job_title,
            company_name,
            status
          )
        `)
        .eq("resume_id", resumeId);

      if (error) throw error;

      const jobs = data?.map((item: any) => item.jobs).filter(Boolean) || [];
      setLinkedJobs(jobs);
    } catch (error) {
      console.error("Error fetching linked jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || linkedJobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Briefcase className="h-3 w-3" />
        Used for {linkedJobs.length} job{linkedJobs.length !== 1 ? 's' : ''}:
      </p>
      <div className="flex flex-wrap gap-1">
        {linkedJobs.map((job) => (
          <Button
            key={job.id}
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => navigate('/jobs')}
          >
            {job.company_name}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        ))}
      </div>
    </div>
  );
}
