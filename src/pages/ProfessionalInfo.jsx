import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppNav } from "@/components/layout/AppNav";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { Briefcase, GraduationCap, Award, FolderKanban, Code, FileText, User, Settings as SettingsIcon } from "lucide-react";
import { EmploymentHistory } from "@/components/profile/EmploymentHistory";
import { EducationHistory } from "@/components/profile/EducationHistory";
import { CertificationsManagement } from "@/components/profile/CertificationsManagement";
import { ProjectsManagement } from "@/components/profile/ProjectsManagement";
import { SkillsManagement } from "@/components/profile/SkillsManagement";

const ProfessionalInfo = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [professionalSummary, setProfessionalSummary] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const sidebarContent = (
    <div className="space-y-2">
      <h3 className="font-bold text-lg mb-4">Navigate</h3>
      
      <Link
        to="/profile-settings"
        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        My Account
      </Link>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2 px-3">Professional Info:</p>
        
        <button
          onClick={() => document.getElementById('professional-summary')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Summary & Links
        </button>
        <button
          onClick={() => document.getElementById('employment')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Briefcase className="h-4 w-4 inline mr-2" />
          Employment
        </button>
        <button
          onClick={() => document.getElementById('education')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <GraduationCap className="h-4 w-4 inline mr-2" />
          Education
        </button>
        <button
          onClick={() => document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Award className="h-4 w-4 inline mr-2" />
          Certifications
        </button>
        <button
          onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <FolderKanban className="h-4 w-4 inline mr-2" />
          Projects
        </button>
        <button
          onClick={() => document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Code className="h-4 w-4 inline mr-2" />
          Skills
        </button>
      </div>

      <Link
        to="/settings"
        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2 mt-2 pt-2 border-t"
      >
        <SettingsIcon className="h-4 w-4" />
        Settings & Account
      </Link>
    </div>
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden">
      <AppNav />
      <LeftSidebar>
        {sidebarContent}
      </LeftSidebar>
      
      <main className="pt-20 md:pt-6 md:ml-64 w-full">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 break-words">
              Professional Information
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              Manage your professional experience, education, and skills
            </p>
          </div>

          <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Professional Summary & Links */}
            <div id="professional-summary" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Professional Summary & Links</h2>
              <div className="space-y-4 w-full">
                <div className="space-y-2">
                  <Label htmlFor="professional-summary" className="text-sm sm:text-base">Professional Summary</Label>
                  <textarea
                    id="professional-summary"
                    value={professionalSummary}
                    onChange={(e) => setProfessionalSummary(e.target.value)}
                    className="w-full min-h-[100px] sm:min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-y"
                    placeholder="A brief summary of your professional background, skills, and career goals..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="text-sm sm:text-base">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="linkedin.com/in/..."
                      className="w-full text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio" className="text-sm sm:text-base">Portfolio URL</Label>
                    <Input
                      id="portfolio"
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="yourportfolio.com"
                      className="w-full text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github" className="text-sm sm:text-base">GitHub URL</Label>
                    <Input
                      id="github"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="github.com/..."
                      className="w-full text-sm sm:text-base"
                    />
                  </div>
                </div>
                <Button className="w-full sm:w-auto">
                  Save Professional Information
                </Button>
              </div>
            </div>

            {/* Employment History */}
            <div id="employment" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Employment History</h2>
              <EmploymentHistory userId={session.user.id} />
            </div>

            {/* Education */}
            <div id="education" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Education</h2>
              <EducationHistory userId={session.user.id} />
            </div>

            {/* Certifications */}
            <div id="certifications" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Certifications</h2>
              <CertificationsManagement userId={session.user.id} />
            </div>

            {/* Projects */}
            <div id="projects" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Projects</h2>
              <ProjectsManagement userId={session.user.id} />
            </div>

            {/* Skills */}
            <div id="skills" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20 w-full overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words">Skills</h2>
              <SkillsManagement userId={session.user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalInfo;
