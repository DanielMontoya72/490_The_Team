import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Briefcase, FileText, TrendingUp, Target, Award, Loader2, User, GraduationCap, Building, Award as CertIcon, FolderOpen, Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function MenteeProgressView({ menteeId, relationshipId }: { menteeId: string; relationshipId: string }) {
  // State for viewing material content
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [showJobsDialog, setShowJobsDialog] = useState(false);
  const [showInterviewsDialog, setShowInterviewsDialog] = useState(false);
  
  // Get permissions
  const { data: relationship, isLoading: permissionsLoading } = useQuery({
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

  const rawPermissions = (relationship?.permissions as any) || {};
  // Handle both permission formats: "view_profile" and "can_view_profile"
  const permissions = {
    view_profile: rawPermissions.view_profile || rawPermissions.can_view_profile,
    view_jobs: rawPermissions.view_jobs || rawPermissions.can_view_jobs,
    view_interviews: rawPermissions.view_interviews || rawPermissions.can_view_interviews,
    view_resume: rawPermissions.view_resume || rawPermissions.can_view_resumes,
    view_skills: rawPermissions.view_skills || rawPermissions.can_view_skills,
    view_education: rawPermissions.view_education || rawPermissions.can_view_education,
    view_employment: rawPermissions.view_employment || rawPermissions.can_view_employment,
    view_certifications: rawPermissions.view_certifications || rawPermissions.can_view_certifications,
    view_projects: rawPermissions.view_projects || rawPermissions.can_view_projects,
    view_materials: rawPermissions.view_materials || rawPermissions.can_view_materials,
    view_goals: rawPermissions.view_goals || rawPermissions.can_view_goals,
  };
  const hasAnyPermission = permissions.view_jobs || permissions.view_interviews || permissions.view_resume || 
    permissions.view_profile || permissions.view_skills || permissions.view_education || 
    permissions.view_employment || permissions.view_certifications || permissions.view_projects ||
    permissions.view_goals || permissions.view_materials;

  // Get profile information
  const { data: profile } = useQuery({
    queryKey: ['mentee-profile', menteeId, permissions.view_profile],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email, phone, bio')
        .eq('user_id', menteeId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_profile && !permissionsLoading
  });

  // Get skills
  const { data: skills } = useQuery({
    queryKey: ['mentee-skills', menteeId, permissions.view_skills],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, skill_name, proficiency_level, category')
        .eq('user_id', menteeId);

      if (error) {
        console.error('Error fetching skills:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_skills && !permissionsLoading
  });

  // Get education
  const { data: education } = useQuery({
    queryKey: ['mentee-education', menteeId, permissions.view_education],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('education')
        .select('id, institution_name, degree_type, field_of_study, graduation_date, is_current')
        .eq('user_id', menteeId)
        .order('graduation_date', { ascending: false });

      if (error) {
        console.error('Error fetching education:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_education && !permissionsLoading
  });

  // Get employment history
  const { data: employment } = useQuery({
    queryKey: ['mentee-employment', menteeId, permissions.view_employment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employment_history')
        .select('id, company_name, job_title, start_date, end_date, is_current')
        .eq('user_id', menteeId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching employment:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_employment && !permissionsLoading
  });

  // Get certifications
  const { data: certifications } = useQuery({
    queryKey: ['mentee-certifications', menteeId, permissions.view_certifications],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certifications')
        .select('id, certification_name, issuing_organization, date_earned, expiration_date')
        .eq('user_id', menteeId)
        .order('date_earned', { ascending: false });

      if (error) {
        console.error('Error fetching certifications:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_certifications && !permissionsLoading
  });

  // Get projects
  const { data: projects } = useQuery({
    queryKey: ['mentee-projects', menteeId, permissions.view_projects],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, description, technologies, start_date, end_date')
        .eq('user_id', menteeId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_projects && !permissionsLoading
  });

  // Get job statistics
  const { data: jobStats } = useQuery({
    queryKey: ['mentee-job-stats', menteeId, permissions.view_jobs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, created_at')
        .eq('user_id', menteeId)
        .eq('is_archived', false);

      if (error) {
        console.error('Error fetching jobs:', error);
        return null;
      }

      const total = data?.length || 0;
      const applied = data?.filter(j => ['Applied', 'Interview', 'Offer'].includes(j.status)).length || 0;
      const interviews = data?.filter(j => j.status === 'Interview').length || 0;
      const offers = data?.filter(j => j.status === 'Offer').length || 0;

      return { total, applied, interviews, offers };
    },
    enabled: !!permissions.view_jobs && !permissionsLoading
  });

  // Get interview statistics and full list
  const { data: interviewData } = useQuery({
    queryKey: ['mentee-interview-stats', menteeId, permissions.view_interviews],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('id, status, interview_date, interview_type, job_id')
        .eq('user_id', menteeId)
        .order('interview_date', { ascending: false });

      if (error) {
        console.error('Error fetching interviews:', error);
        return { interviews: [], stats: { total: 0, upcoming: 0, completed: 0 } };
      }

      // Fetch job details for each interview
      const jobIds = [...new Set(data?.map(i => i.job_id).filter(Boolean))];
      let jobsMap: Record<string, any> = {};
      
      if (jobIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, job_title, company_name')
          .in('id', jobIds);
        
        jobsMap = (jobsData || []).reduce((acc, job) => {
          acc[job.id] = job;
          return acc;
        }, {} as Record<string, any>);
      }

      const interviewsWithJobs = data?.map(interview => ({
        ...interview,
        job_title: jobsMap[interview.job_id]?.job_title || 'Unknown Position',
        company_name: jobsMap[interview.job_id]?.company_name || 'Unknown Company'
      })) || [];

      const total = data?.length || 0;
      const upcoming = data?.filter(i => new Date(i.interview_date) > new Date() && i.status === 'scheduled').length || 0;
      const completed = data?.filter(i => i.status === 'completed').length || 0;

      return { 
        interviews: interviewsWithJobs,
        stats: { total, upcoming, completed } 
      };
    },
    enabled: !!permissions.view_interviews && !permissionsLoading
  });

  const interviewStats = interviewData?.stats;
  const interviewsList = interviewData?.interviews || [];

  // Get technical prep progress
  const { data: techStats } = useQuery({
    queryKey: ['mentee-tech-stats', menteeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technical_prep_attempts')
        .select('id, score, challenge_type, completed_at')
        .eq('user_id', menteeId)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching tech stats:', error);
        return { total: 0, avgScore: 0, recentAttempts: [] };
      }

      const total = data?.length || 0;
      const avgScore = total > 0 ? Math.round(data.reduce((sum, a) => sum + (a.score || 0), 0) / total) : 0;
      const recentAttempts = data?.slice(0, 5) || [];

      return { total, avgScore, recentAttempts };
    },
    enabled: !permissionsLoading
  });

  // Get application materials with file_url for viewing
  const { data: materials } = useQuery({
    queryKey: ['mentee-materials', menteeId, permissions.view_resume],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_materials')
        .select('id, material_type, version_name, file_url, file_name, created_at')
        .eq('user_id', menteeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching materials:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_resume && !permissionsLoading
  });

  // Get career goals
  const { data: goals } = useQuery({
    queryKey: ['mentee-goals', menteeId, permissions.view_goals],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_goals')
        .select('id, goal_title, goal_description, goal_type, status, progress_percentage, target_date')
        .eq('user_id', menteeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_goals && !permissionsLoading
  });

  // Get detailed jobs list
  const { data: jobsList } = useQuery({
    queryKey: ['mentee-jobs-list', menteeId, permissions.view_jobs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status, created_at, application_deadline')
        .eq('user_id', menteeId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs list:', error);
        return null;
      }
      return data;
    },
    enabled: !!permissions.view_jobs && !permissionsLoading
  });

  // Function to handle material preview
  const handleViewMaterial = (material: any) => {
    if (material.file_url) {
      const url = material.file_url.trim();
      
      // Check if it's already a full URL (uploaded files have full Supabase storage URLs)
      if (url.startsWith('https://') || url.includes('supabase.co/storage')) {
        window.open(url, '_blank');
        return;
      }
      
      // Check if it's a placeholder or generated path (not a real file)
      if (url.startsWith('/')) {
        // This is likely a generated cover letter - show message that file doesn't exist
        setSelectedMaterial(material);
        return;
      }
      
      // Content is stored directly (text content) - show in dialog
      setSelectedMaterial(material);
    }
  };

  if (permissionsLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading progress data...
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyPermission) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Your mentee hasn't shared their progress information yet.
          <br />
          Ask them to update share settings to view their job search progress.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information Section */}
      {permissions.view_profile && profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Basic profile and contact details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{profile.first_name} {profile.last_name}</p>
              </div>
              {profile.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{profile.email}</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{profile.phone}</p>
                </div>
              )}
              {profile.bio && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Bio</p>
                  <p className="text-sm">{profile.bio}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Section */}
      {permissions.view_skills && skills && skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills & Competencies</CardTitle>
            <CardDescription>{skills.length} skills listed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: any) => (
                <Badge key={skill.id} variant="secondary" className="text-sm">
                  {skill.skill_name}
                  {skill.proficiency_level && (
                    <span className="ml-1 text-xs opacity-70">({skill.proficiency_level})</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education Section */}
      {permissions.view_education && education && education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education History
            </CardTitle>
            <CardDescription>{education.length} education entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {education.map((edu: any) => (
                <div key={edu.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{edu.institution_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {edu.degree_type} in {edu.field_of_study}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {edu.is_current ? 'Currently enrolled' : 
                      edu.graduation_date ? `Graduated ${new Date(edu.graduation_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment Section */}
      {permissions.view_employment && employment && employment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Employment History
            </CardTitle>
            <CardDescription>{employment.length} positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employment.map((job: any) => (
                <div key={job.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{job.job_title}</p>
                  <p className="text-sm">{job.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.start_date).toLocaleDateString()} - {job.is_current ? 'Present' : 
                      job.end_date ? new Date(job.end_date).toLocaleDateString() : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications Section */}
      {permissions.view_certifications && certifications && certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CertIcon className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>{certifications.length} certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certifications.map((cert: any) => (
                <div key={cert.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{cert.certification_name}</p>
                  <p className="text-sm text-muted-foreground">{cert.issuing_organization}</p>
                  <p className="text-xs text-muted-foreground">
                    Earned: {new Date(cert.date_earned).toLocaleDateString()}
                    {cert.expiration_date && ` • Expires: ${new Date(cert.expiration_date).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Section */}
      {permissions.view_projects && projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Projects & Portfolio
            </CardTitle>
            <CardDescription>{projects.length} projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div key={project.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{project.project_name}</p>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{tech}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Search Progress Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {permissions.view_jobs && jobStats && (
          <>
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowJobsDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {jobStats.applied} applications sent
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowInterviewsDialog(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interviewStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {interviewStats?.upcoming || 0} upcoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offers</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobStats.offers}</div>
                <p className="text-xs text-muted-foreground">
                  Job offers received
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tech Prep</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{techStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg score: {techStats?.avgScore || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Jobs List */}
      {permissions.view_jobs && jobsList && jobsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Saved Jobs & Applications
            </CardTitle>
            <CardDescription>Recent job applications and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobsList.slice(0, 10).map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{job.job_title}</p>
                    <p className="text-sm text-muted-foreground">{job.company_name}</p>
                    {job.application_deadline && (
                      <p className="text-xs text-muted-foreground">
                        Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        job.status === 'Offer' ? 'default' : 
                        job.status === 'Interview' ? 'secondary' : 
                        job.status === 'Applied' ? 'outline' : 'outline'
                      }
                    >
                      {job.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {permissions.view_interviews && interviewStats && (
        <Card>
          <CardHeader>
            <CardTitle>Interview Activity</CardTitle>
            <CardDescription>Upcoming and completed interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Upcoming</span>
                  <span className="text-sm text-muted-foreground">{interviewStats.upcoming}</span>
                </div>
                <Progress value={(interviewStats.upcoming / Math.max(interviewStats.total, 1)) * 100} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm text-muted-foreground">{interviewStats.completed}</span>
                </div>
                <Progress value={(interviewStats.completed / Math.max(interviewStats.total, 1)) * 100} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {techStats && techStats.recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Technical Prep</CardTitle>
            <CardDescription>Latest practice attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {techStats.recentAttempts.map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{attempt.challenge_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={attempt.score >= 80 ? 'default' : attempt.score >= 60 ? 'secondary' : 'destructive'}>
                    {attempt.score}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {permissions.view_resume && materials && materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application Materials
            </CardTitle>
            <CardDescription>Resumes and cover letters - click to view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materials.map((material: any) => (
                <div 
                  key={material.id} 
                  className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border"
                  onClick={() => handleViewMaterial(material)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{material.version_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{material.material_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(material.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">View</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Goals Section */}
      {permissions.view_goals && goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Career Goals
            </CardTitle>
            <CardDescription>{goals.length} goals tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals.map((goal: any) => (
                <div key={goal.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{goal.goal_title}</p>
                    <Badge 
                      variant={goal.status === 'completed' ? 'default' : goal.status === 'in_progress' ? 'secondary' : 'outline'}
                    >
                      {goal.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {goal.goal_description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{goal.goal_description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{goal.goal_type}</span>
                    {goal.target_date && <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>}
                  </div>
                  {goal.progress_percentage !== null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">Progress</span>
                        <span className="text-xs">{goal.progress_percentage}%</span>
                      </div>
                      <Progress value={goal.progress_percentage} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Content Viewer Dialog */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedMaterial?.version_name || 'Application Material'}
            </DialogTitle>
            <DialogDescription>
              {selectedMaterial?.material_type === 'cover_letter' ? 'Cover Letter' : 'Resume'} - 
              Created {selectedMaterial?.created_at ? new Date(selectedMaterial.created_at).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted rounded-lg whitespace-pre-wrap">
              {selectedMaterial?.file_url}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Jobs Dialog */}
      <Dialog open={showJobsDialog} onOpenChange={setShowJobsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Mentee's Job Applications
            </DialogTitle>
            <DialogDescription>
              {jobsList?.length || 0} total job applications
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            <div className="space-y-3">
              {jobsList && jobsList.length > 0 ? (
                jobsList.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{job.job_title}</p>
                      <p className="text-sm text-muted-foreground">{job.company_name}</p>
                      {job.application_deadline && (
                        <p className="text-xs text-muted-foreground">
                          Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          job.status === 'Offer' ? 'default' : 
                          job.status === 'Interview' ? 'secondary' : 
                          job.status === 'Applied' ? 'outline' : 'outline'
                        }
                      >
                        {job.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No job applications found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Interviews Dialog */}
      <Dialog open={showInterviewsDialog} onOpenChange={setShowInterviewsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mentee's Interviews
            </DialogTitle>
            <DialogDescription>
              {interviewsList?.length || 0} total interviews ({interviewStats?.upcoming || 0} upcoming)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            <div className="space-y-3">
              {interviewsList && interviewsList.length > 0 ? (
                interviewsList.map((interview: any) => (
                  <div key={interview.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{interview.job_title}</p>
                      <p className="text-sm text-muted-foreground">{interview.company_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {interview.interview_type} interview
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          interview.status === 'completed' ? 'default' : 
                          interview.status === 'scheduled' ? 'secondary' : 'outline'
                        }
                      >
                        {interview.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(interview.interview_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No interviews found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
