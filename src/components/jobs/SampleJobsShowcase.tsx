import { SAMPLE_JOB_POSTINGS } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, DollarSign, Briefcase, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SampleJobsShowcaseProps {
  onAddJob?: (job: typeof SAMPLE_JOB_POSTINGS[0]) => void;
}

export const SampleJobsShowcase = ({ onAddJob }: SampleJobsShowcaseProps) => {
  const copyJobDetails = (job: typeof SAMPLE_JOB_POSTINGS[0]) => {
    const details = `${job.title} at ${job.company}\n${job.location} - ${job.type}\nSalary: $${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}\n\n${job.description}\n\nRequirements:\n${job.requirements.map(r => `• ${r}`).join('\n')}`;
    navigator.clipboard.writeText(details);
    toast.success("Job details copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Sample Job Postings
        </CardTitle>
        <CardDescription>
          Example job postings for demonstration. Use these to practice tracking and tailoring your applications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_JOB_POSTINGS.map((job, idx) => (
            <Card key={idx} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3" />
                      {job.company}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{job.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  <DollarSign className="h-3 w-3" />
                  {job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
                <Badge variant="outline" className="text-xs">{job.industry}</Badge>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => copyJobDetails(job)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  {onAddJob && (
                    <Button size="sm" className="flex-1" onClick={() => onAddJob(job)}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Add Job
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
