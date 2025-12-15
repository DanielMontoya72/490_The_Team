import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const defaultPermissions = {
  view_profile: false,
  view_resume: false,
  view_jobs: false,
  view_interviews: false,
  view_applications: false,
  view_skills: false,
  view_education: false,
  view_employment: false,
  view_certifications: false,
  view_projects: false,
  view_goals: false
};

export function MentorShareSettings({ relationshipId }: { relationshipId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState(defaultPermissions);

  // Get current permissions
  const { data: relationship, isSuccess } = useQuery({
    queryKey: ['relationship-permissions', relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('permissions')
        .eq('id', relationshipId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Sync state with database when relationship data loads
  useEffect(() => {
    if (isSuccess && relationship?.permissions) {
      const dbPermissions = relationship.permissions as typeof defaultPermissions;
      setPermissions({
        ...defaultPermissions,
        ...dbPermissions
      });
    }
  }, [isSuccess, relationship]);

  const updatePermissions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('mentor_relationships')
        .update({ permissions })
        .eq('id', relationshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all permission-dependent queries
      queryClient.invalidateQueries({ queryKey: ['relationship-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-job-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-interview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-tech-stats'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-materials'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-skills'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-education'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-employment'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-certifications'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-projects'] });
      queryClient.invalidateQueries({ queryKey: ['mentee-goals'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-relationships'] });
      toast({
        title: "Permissions Updated",
        description: "Your mentor can now access the selected information."
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Permissions",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleToggle = (key: string, value: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Share Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Control What Your Mentor Can See
          </DialogTitle>
          <DialogDescription>
            Choose what information you want to share with this mentor
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
                <CardDescription>Basic profile and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_profile"
                    checked={permissions.view_profile}
                    onCheckedChange={(checked) => handleToggle('view_profile', checked as boolean)}
                  />
                  <Label htmlFor="view_profile" className="cursor-pointer">
                    View profile information (name, email, bio)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_skills"
                    checked={permissions.view_skills}
                    onCheckedChange={(checked) => handleToggle('view_skills', checked as boolean)}
                  />
                  <Label htmlFor="view_skills" className="cursor-pointer">
                    View skills and competencies
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Professional Background</CardTitle>
                <CardDescription>Education, employment, and qualifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_education"
                    checked={permissions.view_education}
                    onCheckedChange={(checked) => handleToggle('view_education', checked as boolean)}
                  />
                  <Label htmlFor="view_education" className="cursor-pointer">
                    View education history
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_employment"
                    checked={permissions.view_employment}
                    onCheckedChange={(checked) => handleToggle('view_employment', checked as boolean)}
                  />
                  <Label htmlFor="view_employment" className="cursor-pointer">
                    View employment history
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_certifications"
                    checked={permissions.view_certifications}
                    onCheckedChange={(checked) => handleToggle('view_certifications', checked as boolean)}
                  />
                  <Label htmlFor="view_certifications" className="cursor-pointer">
                    View certifications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_projects"
                    checked={permissions.view_projects}
                    onCheckedChange={(checked) => handleToggle('view_projects', checked as boolean)}
                  />
                  <Label htmlFor="view_projects" className="cursor-pointer">
                    View projects and portfolio
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Search Progress</CardTitle>
                <CardDescription>Applications, interviews, and materials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_resume"
                    checked={permissions.view_resume}
                    onCheckedChange={(checked) => handleToggle('view_resume', checked as boolean)}
                  />
                  <Label htmlFor="view_resume" className="cursor-pointer">
                    View resumes and cover letters
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_jobs"
                    checked={permissions.view_jobs}
                    onCheckedChange={(checked) => handleToggle('view_jobs', checked as boolean)}
                  />
                  <Label htmlFor="view_jobs" className="cursor-pointer">
                    View saved jobs and applications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_interviews"
                    checked={permissions.view_interviews}
                    onCheckedChange={(checked) => handleToggle('view_interviews', checked as boolean)}
                  />
                  <Label htmlFor="view_interviews" className="cursor-pointer">
                    View scheduled interviews
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_applications"
                    checked={permissions.view_applications}
                    onCheckedChange={(checked) => handleToggle('view_applications', checked as boolean)}
                  />
                  <Label htmlFor="view_applications" className="cursor-pointer">
                    View application status and metrics
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_goals"
                    checked={permissions.view_goals}
                    onCheckedChange={(checked) => handleToggle('view_goals', checked as boolean)}
                  />
                  <Label htmlFor="view_goals" className="cursor-pointer">
                    View career goals and progress
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => updatePermissions.mutate()}
            disabled={updatePermissions.isPending}
            className="flex-1"
          >
            {updatePermissions.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
