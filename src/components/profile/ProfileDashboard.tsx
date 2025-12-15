import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTextSize } from "@/components/text-size-provider";
import { IntegrationsSection } from "@/components/integrations/IntegrationsSection";
import { GitHubShowcase } from "@/components/integrations/GitHubShowcase";
import { ProfileCertificationsBadges } from "@/components/profile/ProfileCertificationsBadges";
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Send,
  Calendar,
  CheckCircle,
  Download,
  Trophy,
  Target,
} from "lucide-react";

interface ProfileStats {
  hasBasicInfo: boolean;
  employmentCount: number;
  educationCount: number;
  certificationsCount: number;
  skillsCount: number;
  projectsCount: number;
}

interface JobStats {
  totalJobs: number;
  applied: number;
  interviewed: number;
  offers: number;
  responseRate: number;
}

interface ProfileDashboardProps {
  userId: string;
  onNavigateToTab?: (tab: string) => void;
}

export const ProfileDashboard = ({ userId, onNavigateToTab }: ProfileDashboardProps) => {
  const { theme: currentTheme } = useTheme();
  const { textSize } = useTextSize();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats>({
    hasBasicInfo: false,
    employmentCount: 0,
    educationCount: 0,
    certificationsCount: 0,
    skillsCount: 0,
    projectsCount: 0,
  });
  const [jobStats, setJobStats] = useState<JobStats>({
    totalJobs: 0,
    applied: 0,
    interviewed: 0,
    offers: 0,
    responseRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Define responsive text sizes based on textSize setting
  const getTextSizes = () => {
    switch (textSize) {
      case 'xs':
        return {
          legend: 'text-xs',
          legendMd: 'md:text-xs',
          title: 'text-xs sm:text-sm'
        };
      case 'sm':
        return {
          legend: 'text-xs',
          legendMd: 'md:text-sm',
          title: 'text-sm sm:text-base'
        };
      case 'md':
        return {
          legend: 'text-sm',
          legendMd: 'md:text-base',
          title: 'text-base sm:text-lg'
        };
      case 'lg':
        return {
          legend: 'text-base',
          legendMd: 'md:text-lg',
          title: 'text-lg sm:text-xl'
        };
      case 'xl':
        return {
          legend: 'text-lg',
          legendMd: 'md:text-xl',
          title: 'text-xl sm:text-2xl'
        };
      default:
        return {
          legend: 'text-sm',
          legendMd: 'md:text-base',
          title: 'text-base sm:text-lg'
        };
    }
  };

  const textSizes = getTextSizes();

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchProfileStats();
  }, [userId]);

  const fetchProfileStats = async () => {
    try {
      // Fetch basic profile info
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfileData(profile);

      // Check if basic info is complete
      const hasBasicInfo = !!(
        profile?.first_name &&
        profile?.last_name &&
        profile?.email &&
        profile?.headline
      );

      // Fetch counts for all sections
      const [employment, education, certifications, skills, projects, jobs] = await Promise.all([
        supabase.from("employment_history").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("education").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("certifications").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("skills").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("jobs").select("status").eq("user_id", userId),
      ]);

      setStats({
        hasBasicInfo,
        employmentCount: employment.count || 0,
        educationCount: education.count || 0,
        certificationsCount: certifications.count || 0,
        skillsCount: skills.count || 0,
        projectsCount: projects.count || 0,
      });

      // Calculate job statistics
      const jobsData = jobs.data || [];
      const statusCounts: Record<string, number> = {};
      jobsData.forEach((job: any) => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      });

      const totalJobs = jobsData.length;
      const applied = statusCounts['Applied'] || 0;
      const interviewed = (statusCounts['Phone Screen'] || 0) + 
                          (statusCounts['Interview'] || 0) + 
                          (statusCounts['Interview Scheduled'] || 0) + 
                          (statusCounts['Offer Received'] || 0) + 
                          (statusCounts['Accepted'] || 0);
      const offers = (statusCounts['Offer Received'] || 0) + (statusCounts['Accepted'] || 0);
      const responseRate = applied > 0 ? Math.round((interviewed / applied) * 100) : 0;

      setJobStats({
        totalJobs,
        applied,
        interviewed,
        offers,
        responseRate,
      });
    } catch (error: any) {
      toast({
        title: "Error fetching profile data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompleteness = () => {
    let completed = 0;
    let total = 6;

    if (stats.hasBasicInfo) completed++;
    if (stats.employmentCount > 0) completed++;
    if (stats.educationCount > 0) completed++;
    if (stats.certificationsCount > 0) completed++;
    if (stats.skillsCount > 0) completed++;
    if (stats.projectsCount > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const getAchievementBadges = () => {
    const badges = [];
    if (calculateCompleteness() === 100) badges.push({ name: "Profile Master", icon: Trophy, color: "text-yellow-500" });
    if (stats.employmentCount >= 3) badges.push({ name: "Career Pro", icon: Briefcase, color: "text-blue-500" });
    if (stats.skillsCount >= 10) badges.push({ name: "Skill Collector", icon: Code, color: "text-purple-500" });
    if (stats.projectsCount >= 5) badges.push({ name: "Project Hero", icon: FolderKanban, color: "text-green-500" });
    if (stats.certificationsCount >= 3) badges.push({ name: "Certified Expert", icon: Award, color: "text-orange-500" });
    return badges;
  };

  const industryBenchmarks = {
    Technology: { avgSkills: 12, avgProjects: 4, avgCerts: 2 },
    Healthcare: { avgSkills: 8, avgProjects: 2, avgCerts: 4 },
    Finance: { avgSkills: 10, avgProjects: 3, avgCerts: 3 },
    Education: { avgSkills: 7, avgProjects: 3, avgCerts: 2 },
    default: { avgSkills: 10, avgProjects: 3, avgCerts: 2 }
  };

  const benchmark = industryBenchmarks[profileData?.industry] || industryBenchmarks.default;
  
  const handleExportPDF = () => {
    const element = document.getElementById('profile-summary');
    const opt = {
      margin: 1,
      filename: 'profile-summary.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
    toast({ title: "Profile exported to PDF!" });
  };

  const chartData = [
    { name: 'Skills', you: stats.skillsCount, benchmark: benchmark.avgSkills },
    { name: 'Projects', you: stats.projectsCount, benchmark: benchmark.avgProjects },
    { name: 'Certifications', you: stats.certificationsCount, benchmark: benchmark.avgCerts },
  ];

  const pieData = [
    { name: 'Employment', value: stats.employmentCount },
    { name: 'Education', value: stats.educationCount },
    { name: 'Certifications', value: stats.certificationsCount },
    { name: 'Skills', value: stats.skillsCount },
    { name: 'Projects', value: stats.projectsCount },
  ].filter(item => item.value > 0);

  // Colorblind-friendly color palette
  const COLORS = currentTheme === 'colorblind' 
    ? ['#FF5800', '#1E90FF', '#000000', '#FFFFFF', '#FF5800'] // Orange, blue, black, white, orange
    : ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']; // Default colors

  const sections = [
    {
      name: "Basic Information",
      icon: User,
      complete: stats.hasBasicInfo,
      count: stats.hasBasicInfo ? 1 : 0,
      description: "Name, email, headline, and contact info",
      tabValue: "basic",
      route: "/profile-settings#basic-info",
    },
    {
      name: "Employment History",
      icon: Briefcase,
      complete: stats.employmentCount > 0,
      count: stats.employmentCount,
      description: "Work experience and job history",
      tabValue: "employment",
      route: "/professional-info#employment",
    },
    {
      name: "Education",
      icon: GraduationCap,
      complete: stats.educationCount > 0,
      count: stats.educationCount,
      description: "Academic background and degrees",
      tabValue: "education",
      route: "/professional-info#education",
    },
    {
      name: "Certifications",
      icon: Award,
      complete: stats.certificationsCount > 0,
      count: stats.certificationsCount,
      description: "Professional certifications and licenses",
      tabValue: "certifications",
      route: "/professional-info#certifications",
    },
    {
      name: "Skills",
      icon: Code,
      complete: stats.skillsCount > 0,
      count: stats.skillsCount,
      description: "Technical and soft skills",
      tabValue: "skills",
      route: "/professional-info#skills",
    },
    {
      name: "Projects",
      icon: FolderKanban,
      complete: stats.projectsCount > 0,
      count: stats.projectsCount,
      description: "Portfolio of professional projects",
      tabValue: "projects",
      route: "/professional-info#projects",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const badges = getAchievementBadges();

  return (
    <div className="space-y-6 w-full overflow-x-hidden" id="profile-summary">
      {/* Welcome Section */}
      <Card className="border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {profileData?.profile_picture_url && (
                <img
                  src={profileData.profile_picture_url}
                  alt={`${profileData?.first_name || "User"}'s profile`}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
                />
              )}
              {!profileData?.profile_picture_url && (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 truncate">
                  Welcome back, {profileData?.first_name || "User"}!
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Build your professional profile to stand out to employers
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button onClick={handleExportPDF} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <TrendingUp className="h-8 w-8 text-primary hidden sm:block" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              Achievement Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 sm:gap-4 w-full">
              {badges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <div key={index} className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg">
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${badge.color}`} />
                    <span className="font-medium text-sm sm:text-base">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Profile Completeness</span>
            <Badge variant={completeness === 100 ? "default" : "secondary"} className="text-base sm:text-lg px-2 sm:px-3 py-1">
              {completeness}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completeness} className="h-3" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {completeness === 100
              ? "Excellent! Your profile is complete."
              : `Complete ${6 - sections.filter((s) => s.complete).length} more ${
                  6 - sections.filter((s) => s.complete).length === 1 ? "section" : "sections"
                } to reach 100%.`}
          </p>
        </CardContent>
      </Card>

      {/* Section Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.name}
              className={`${section.complete ? "border-green-500/20" : "border-muted"} cursor-pointer hover:shadow-lg transition-all hover:border-primary/40 w-full`}
              onClick={() => {
                if (section.route) {
                  const [path, hash] = section.route.split('#');
                  
                  // Check if we're already on the target page
                  if (window.location.pathname === path) {
                    // Just scroll to the element
                    if (hash) {
                      const element = document.getElementById(hash);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  } else {
                    // Navigate to the page
                    navigate(section.route);
                    // Wait for navigation and then scroll to the element
                    if (hash) {
                      setTimeout(() => {
                        const element = document.getElementById(hash);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 300);
                    }
                  }
                } else {
                  onNavigateToTab?.(section.tabValue);
                }
              }}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${section.complete ? "text-green-500" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base">{section.name}</h3>
                        {section.count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {section.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  {section.complete ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Profile Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full">
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.employmentCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Work Experience</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.skillsCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Skills</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.projectsCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Projects</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.educationCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Education</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.certificationsCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Certifications</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{completeness}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Application Statistics */}
      {jobStats.totalJobs > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Job Application Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
              <div className="text-center p-3 sm:p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-500">{jobStats.totalJobs}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Jobs</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-500">{jobStats.applied}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Applied</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-500/10 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-purple-500">{jobStats.interviewed}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Interviews</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-orange-500/10 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-orange-500">{jobStats.offers}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Offers</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 text-center p-3 sm:p-4 bg-pink-500/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-pink-500">{jobStats.responseRate}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Response Rate</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Comparison Chart */}
      {profileData?.industry && (
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              Industry Comparison - {profileData.industry}
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Legend />
                <Bar 
                  dataKey="you" 
                  fill={currentTheme === 'colorblind' ? '#FF5800' : '#3b82f6'} 
                  name="Your Profile" 
                />
                <Bar 
                  dataKey="benchmark" 
                  fill={currentTheme === 'colorblind' ? '#1E90FF' : '#94a3b8'} 
                  name="Industry Average" 
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 text-center">
              Compare your profile metrics against industry standards
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Distribution Chart */}
      {pieData.length > 0 && (
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Profile Content Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 w-full">
            <ResponsiveContainer width="100%" height={isMobile ? 350 : 400}>
              <PieChart margin={{ top: 20, right: 100, bottom: 20, left: 100 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => {
                    const index = pieData.findIndex(item => item.name === entry.name);
                    const color = COLORS[index % COLORS.length];
                    // Adjust vertical position for better spacing
                    const yOffset = entry.name === 'Education' ? -10 : 0;
                    return (
                      <text 
                        x={entry.x} 
                        y={entry.y + yOffset} 
                        textAnchor={entry.x > entry.cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs font-semibold"
                        fill={color}
                      >
                        {`${entry.name}: ${entry.value}`}
                      </text>
                    );
                  }}
                  outerRadius={isMobile ? 40 : 55}
                  innerRadius={isMobile ? 0 : 0}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* External Skills & Certifications */}
      <ProfileCertificationsBadges userId={userId} />

      {/* GitHub Showcase */}
      <GitHubShowcase userId={userId} />

      {/* Account Integrations */}
      <IntegrationsSection />
    </div>
  );
};
