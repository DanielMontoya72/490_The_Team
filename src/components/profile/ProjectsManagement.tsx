import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ProjectForm } from "./ProjectForm";
import { FolderKanban, Calendar, Users, ExternalLink, Github, Edit, Trash2, Plus, Target, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  project_name: string;
  description: string;
  role: string;
  start_date: string;
  end_date: string | null;
  project_url: string | null;
  repository_link: string | null;
  technologies: string[] | null;
  status: string;
  industry: string | null;
  project_type: string | null;
  team_size: number | null;
  outcomes: string | null;
}

interface ProjectsManagementProps {
  userId: string;
}

export const ProjectsManagement = ({ userId }: ProjectsManagementProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Project deleted successfully" });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = () => {
    setIsAdding(false);
    setEditingProject(null);
    fetchProjects();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "In Progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "Cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted";
    }
  };

  const filteredAndSortedProjects = projects
    .filter(p => {
      const matchesSearch = p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.technologies?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.project_name.localeCompare(b.project_name);
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isAdding || editingProject) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {editingProject ? "Edit Project" : "Add Project"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            userId={userId}
            project={editingProject}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAdding(false);
              setEditingProject(null);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            Project Portfolio
          </h3>
          <p className="text-muted-foreground text-base">Showcase your professional projects</p>
        </div>
        <Button onClick={() => setIsAdding(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {projects.length > 0 && !isAdding && !editingProject && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, technologies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects added yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add your professional projects to showcase your work
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <FolderKanban className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{project.project_name}</h4>
                        <p className="text-sm text-muted-foreground">{project.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 ml-8">
                      <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                      {project.project_type && (
                        <Badge variant="secondary">{project.project_type}</Badge>
                      )}
                      {project.industry && (
                        <Badge variant="outline">{project.industry}</Badge>
                      )}
                    </div>

                    <p className="text-sm ml-8 whitespace-pre-wrap">{project.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(project.start_date), "MMM yyyy")} -{" "}
                          {project.end_date ? format(new Date(project.end_date), "MMM yyyy") : "Present"}
                        </span>
                      </div>
                      {project.team_size && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>Team of {project.team_size}</span>
                        </div>
                      )}
                    </div>

                    {project.technologies && project.technologies.length > 0 && (
                      <div className="ml-8">
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {project.outcomes && (
                      <div className="ml-8 mt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">Outcomes & Impact:</p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {project.outcomes}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 ml-8">
                      {project.project_url && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => window.open(project.project_url!, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Project
                        </Button>
                      )}
                      {project.repository_link && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => window.open(project.repository_link!, "_blank")}
                        >
                          <Github className="h-3 w-3 mr-1" />
                          View Repository
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(project.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
