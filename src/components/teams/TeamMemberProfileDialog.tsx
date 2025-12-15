import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Calendar, Target, Lock, Trophy, FileText, Award, BookOpen, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TeamMemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
}

interface PrivacySettings {
  share_goals: boolean;
  share_achievements: boolean;
  share_job_applications: boolean;
  share_interviews: boolean;
  share_resume_updates: boolean;
  allowed_viewers: string[] | null;
}

export const TeamMemberProfileDialog = ({
  open,
  onOpenChange,
  memberId,
  memberName,
}: TeamMemberProfileDialogProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobMatchAnalyses, setJobMatchAnalyses] = useState<Record<string, any>>({});
  const [interviews, setInterviews] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [canViewProfile, setCanViewProfile] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMemberData();
    }
  }, [open, memberId]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // Fetch member's privacy settings first
      const { data: settingsData } = await supabase
        .from("progress_sharing_settings")
        .select("*")
        .eq("user_id", memberId)
        .maybeSingle();

      const settings: PrivacySettings = {
        share_goals: settingsData?.share_goals ?? true,
        share_achievements: settingsData?.share_achievements ?? true,
        share_job_applications: settingsData?.share_job_applications ?? false,
        share_interviews: settingsData?.share_interviews ?? false,
        share_resume_updates: settingsData?.share_resume_updates ?? false,
        allowed_viewers: settingsData?.allowed_viewers && Array.isArray(settingsData.allowed_viewers) 
          ? settingsData.allowed_viewers as string[] 
          : null,
      };
      setPrivacySettings(settings);

      // Check if current user is allowed to view this member's data
      // Users can always view their own profile
      const isOwnProfile = user.id === memberId;
      const allowedViewers = settings.allowed_viewers;
      const isAllowedViewer = isOwnProfile || 
        !allowedViewers || 
        allowedViewers.length === 0 || 
        allowedViewers.includes(user.id);
      
      setCanViewProfile(isAllowedViewer);

      if (!isAllowedViewer) {
        setJobs([]);
        setInterviews([]);
        setGoals([]);
        setAchievements([]);
        setResumes([]);
        setLoading(false);
        return;
      }

      // Fetch jobs if sharing is enabled
      if (settings.share_job_applications) {
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", memberId)
          .order("created_at", { ascending: false })
          .limit(10);
        setJobs(jobsData || []);

        // Fetch job match analyses for these jobs
        if (jobsData && jobsData.length > 0) {
          const jobIds = jobsData.map(j => j.id);
          const { data: analysesData } = await supabase
            .from("job_match_analyses")
            .select("*")
            .in("job_id", jobIds)
            .order("created_at", { ascending: false });
          
          // Create a map of job_id -> latest analysis
          const analysesMap: Record<string, any> = {};
          analysesData?.forEach(analysis => {
            if (!analysesMap[analysis.job_id]) {
              analysesMap[analysis.job_id] = analysis;
            }
          });
          setJobMatchAnalyses(analysesMap);
        }
      } else {
        setJobs([]);
        setJobMatchAnalyses({});
      }

      // Fetch interviews if sharing is enabled
      if (settings.share_interviews) {
        const { data: interviewsData } = await supabase
          .from("interviews")
          .select("*, jobs(company_name, job_title)")
          .eq("user_id", memberId)
          .order("interview_date", { ascending: false })
          .limit(10);
        setInterviews(interviewsData || []);
      } else {
        setInterviews([]);
      }

      // Fetch goals if sharing is enabled
      if (settings.share_goals) {
        const { data: goalsData } = await supabase
          .from("career_goals")
          .select("*")
          .eq("user_id", memberId)
          .order("created_at", { ascending: false });
        setGoals(goalsData || []);
      } else {
        setGoals([]);
      }

      // Fetch achievements if sharing is enabled
      if (settings.share_achievements) {
        const { data: achievementsData } = await supabase
          .from("goal_achievements")
          .select("*, career_goals(goal_title)")
          .eq("user_id", memberId)
          .order("achievement_date", { ascending: false })
          .limit(10);
        setAchievements(achievementsData || []);
      } else {
        setAchievements([]);
      }

      // Fetch resume updates if sharing is enabled
      if (settings.share_resume_updates) {
        const { data: resumesData } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", memberId)
          .order("updated_at", { ascending: false })
          .limit(10);
        setResumes(resumesData || []);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error("Error fetching member data:", error);
    } finally {
      setLoading(false);
    }
  };

  const PrivateDataMessage = ({ dataType }: { dataType: string }) => (
    <div className="text-center py-8">
      <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">
        {memberName.split(" ")[0]} has chosen not to share their {dataType}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        This information is private
      </p>
    </div>
  );

  const NotAllowedMessage = () => (
    <div className="text-center py-12">
      <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-lg font-medium text-muted-foreground">
        Access Restricted
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {memberName.split(" ")[0]} has not granted you permission to view their profile
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{memberName}'s Profile</DialogTitle>
          <DialogDescription>View member progress and activity</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : !canViewProfile ? (
          <NotAllowedMessage />
        ) : (
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="jobs">Applications</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="resumes">Resumes</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5" />
                <h3 className="font-semibold">Recent Applications</h3>
              </div>
              {!privacySettings?.share_job_applications ? (
                <PrivateDataMessage dataType="job applications" />
              ) : jobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications yet</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => {
                    const analysis = jobMatchAnalyses[job.id];
                    return (
                      <Card key={job.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{job.job_title}</h4>
                              <p className="text-sm text-muted-foreground">{job.company_name}</p>
                            </div>
                            <Badge variant={job.status === "accepted" ? "default" : "secondary"}>
                              {job.status}
                            </Badge>
                          </div>
                          
                          {/* Job Match Score Breakdown */}
                          <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">
                                Match Score: {analysis ? `${analysis.overall_score}%` : 'Not analyzed'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Award className="h-3 w-3 text-primary" />
                                  <span>Skills</span>
                                </div>
                                <Progress value={analysis?.skills_score || 0} className="h-1.5" />
                                <span className="text-muted-foreground">{analysis?.skills_score || 0}%</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Briefcase className="h-3 w-3 text-primary" />
                                  <span>Experience</span>
                                </div>
                                <Progress value={analysis?.experience_score || 0} className="h-1.5" />
                                <span className="text-muted-foreground">{analysis?.experience_score || 0}%</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <BookOpen className="h-3 w-3 text-primary" />
                                  <span>Education</span>
                                </div>
                                <Progress value={analysis?.education_score || 0} className="h-1.5" />
                                <span className="text-muted-foreground">{analysis?.education_score || 0}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            Applied {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5" />
                <h3 className="font-semibold">Interview Schedule</h3>
              </div>
              {!privacySettings?.share_interviews ? (
                <PrivateDataMessage dataType="interviews" />
              ) : interviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No interviews scheduled</p>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => (
                    <Card key={interview.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{interview.interview_type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {interview.jobs?.company_name} - {interview.jobs?.job_title}
                            </p>
                          </div>
                          <Badge>{interview.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(interview.interview_date).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5" />
                <h3 className="font-semibold">Career Goals</h3>
              </div>
              {!privacySettings?.share_goals ? (
                <PrivateDataMessage dataType="career goals" />
              ) : goals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No goals set</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <Card key={goal.id}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{goal.goal_title}</h4>
                            <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
                          </div>
                          <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                            {goal.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{goal.progress_percentage || 0}%</span>
                          </div>
                          <Progress value={goal.progress_percentage || 0} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5" />
                <h3 className="font-semibold">Achievements & Milestones</h3>
              </div>
              {!privacySettings?.share_achievements ? (
                <PrivateDataMessage dataType="achievements" />
              ) : achievements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No achievements yet</p>
              ) : (
                <div className="space-y-3">
                  {achievements.map((achievement) => (
                    <Card key={achievement.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{achievement.achievement_title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {achievement.achievement_description}
                            </p>
                            {achievement.career_goals?.goal_title && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Related to: {achievement.career_goals.goal_title}
                              </p>
                            )}
                          </div>
                          <Badge variant="default">Achieved</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(achievement.achievement_date), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resumes" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">Resume Updates</h3>
              </div>
              {!privacySettings?.share_resume_updates ? (
                <PrivateDataMessage dataType="resume updates" />
              ) : resumes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No resumes yet</p>
              ) : (
                <div className="space-y-3">
                  {resumes.map((resume) => (
                    <Card key={resume.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{resume.resume_name}</h4>
                            {resume.target_role && (
                              <p className="text-sm text-muted-foreground">
                                Target: {resume.target_role}
                              </p>
                            )}
                          </div>
                          {resume.is_default && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
