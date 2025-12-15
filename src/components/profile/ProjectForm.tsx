import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FolderKanban } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const projectSchema = z.object({
  project_name: z.string().min(1, "Project name is required").max(200),
  description: z.string().min(1, "Description is required").max(2000),
  role: z.string().min(1, "Your role is required").max(200),
  start_date: z.date({ required_error: "Start date is required" }),
  end_date: z.date().optional().nullable(),
  project_url: z.string().url().optional().or(z.literal("")),
  repository_link: z.string().url().optional().or(z.literal("")),
  technologies: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  industry: z.string().optional(),
  project_type: z.string().optional(),
  team_size: z.string().optional(),
  outcomes: z.string().max(1000).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  userId: string;
  project?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProjectForm = ({ userId, project, onSuccess, onCancel }: ProjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    project?.start_date ? new Date(project.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    project?.end_date ? new Date(project.end_date) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: project?.project_name || "",
      description: project?.description || "",
      role: project?.role || "",
      project_url: project?.project_url || "",
      repository_link: project?.repository_link || "",
      technologies: project?.technologies?.join(", ") || "",
      status: project?.status || "Completed",
      industry: project?.industry || "",
      project_type: project?.project_type || "",
      team_size: project?.team_size?.toString() || "",
      outcomes: project?.outcomes || "",
    },
  });

  const description = watch("description") || "";
  const outcomes = watch("outcomes") || "";

  const onSubmit = async (data: ProjectFormData) => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const techArray = data.technologies
        ? data.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const projectData = {
        user_id: userId,
        project_name: data.project_name,
        description: data.description,
        role: data.role,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        project_url: data.project_url || null,
        repository_link: data.repository_link || null,
        technologies: techArray,
        status: data.status,
        industry: data.industry || null,
        project_type: data.project_type || null,
        team_size: data.team_size ? parseInt(data.team_size) : null,
        outcomes: data.outcomes || null,
      };

      if (project) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", project.id);
        if (error) throw error;
        toast({ title: "Project updated successfully" });
      } else {
        const { error } = await supabase.from("projects").insert(projectData);
        if (error) throw error;
        toast({ title: "Project added successfully" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="project_name">Project Name *</Label>
          <Input
            id="project_name"
            {...register("project_name")}
            placeholder="E-Commerce Platform Redesign"
            className="mt-1.5 mb-4"
          />
          {errors.project_name && (
            <p className="text-sm text-destructive mt-1">{errors.project_name.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="description">Description *</Label>
            <span className="block text-xs text-muted-foreground mt-2 mb-2">{description.length}/2000</span>
          </div>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Describe the project objectives, challenges, and your contributions..."
            className="mt-1.5 min-h-[120px]"
            maxLength={2000}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">Your Role *</Label>
            <Input
              id="role"
              {...register("role")}
              placeholder="Lead Developer, Project Manager"
          className="mt-2 mb-4"
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              onValueChange={(value) => setValue("status", value)}
              defaultValue={project?.status || "Completed"}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setValue("start_date", date as Date);
                  }}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.start_date && (
              <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setValue("end_date", date as Date);
                  }}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="project_type">Project Type</Label>
            <Select
              onValueChange={(value) => setValue("project_type", value)}
              defaultValue={project?.project_type}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Web Application">Web Application</SelectItem>
                <SelectItem value="Mobile App">Mobile App</SelectItem>
                <SelectItem value="Desktop Application">Desktop Application</SelectItem>
                <SelectItem value="API/Backend">API/Backend</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Data Science">Data Science</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="team_size">Team Size</Label>
            <Input
              id="team_size"
              {...register("team_size")}
              type="number"
              min="1"
              placeholder="5"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="technologies">Technologies</Label>
          <Input
            id="technologies"
            {...register("technologies")}
            placeholder="React, Node.js, PostgreSQL (comma-separated)"
            className="mt-1.5 mb-6"
          />
          <p className="block text-xs text-muted-foreground mt-1 mb-2 break-words whitespace-normal w-full p-2 leading-relaxed text-wrap sm:text-center">Separate technologies with commas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="project_url">Project URL</Label>
            <Input
              id="project_url"
              {...register("project_url")}
              placeholder="https://project.example.com"
              className="mt-1.5"
            />
            {errors.project_url && (
              <p className="text-sm text-destructive mt-1">{errors.project_url.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="repository_link">Repository Link</Label>
            <Input
              id="repository_link"
              {...register("repository_link")}
              placeholder="https://github.com/username/repo"
              className="mt-1.5"
            />
            {errors.repository_link && (
              <p className="text-sm text-destructive mt-1">{errors.repository_link.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            {...register("industry")}
            placeholder="Finance, Healthcare, E-commerce"
            className="mt-1.5"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="outcomes">Outcomes & Impact</Label>
            <span className="block text-xs text-muted-foreground mt-2 mb-1">{outcomes.length}/1000</span>
          </div>
          <Textarea
            id="outcomes"
            {...register("outcomes")}
            placeholder="Increased conversion rate by 25%, reduced load time by 40%..."
            className="mt-1.5 min-h-[100px]"
            maxLength={1000}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-start pt-4">
        <Button type="submit" disabled={isSubmitting}>
          <FolderKanban className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : project ? "Update Project" : "Add Project"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
