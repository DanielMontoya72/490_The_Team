import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/layout/AppNav";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { BasicInfoForm } from "@/components/profile/BasicInfoForm";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { ExternalSkillPlatforms } from "@/components/profile/ExternalSkillPlatforms";
import { User, Settings as SettingsIcon, Briefcase, ChevronRight, FileText, GraduationCap, Award, FolderKanban, Code } from "lucide-react";

const ProfileAndSettings = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isProfessionalInfoExpanded, setIsProfessionalInfoExpanded] = useState(false);

  const sidebarContent = (
    <div className="space-y-2">
      <h3 className="font-bold text-lg mb-4">Navigate</h3>
      
      <Link
        to="/profile-settings"
        className="w-full text-left px-3 py-1.5 rounded-lg bg-muted transition-colors text-sm flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        My Account
      </Link>

      <div>
        <div className="flex items-center gap-1">
          <Link
            to="/professional-info"
            className="flex-1 text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2"
          >
            <Briefcase className="h-4 w-4" />
            Professional Info
          </Link>
          <button
            onClick={() => setIsProfessionalInfoExpanded(!isProfessionalInfoExpanded)}
            className="px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${isProfessionalInfoExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
        
        {isProfessionalInfoExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            <Link
              to="/professional-info#professional-summary"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <FileText className="h-3 w-3" />
              Summary & Links
            </Link>
            <Link
              to="/professional-info#employment"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <Briefcase className="h-3 w-3" />
              Employment
            </Link>
            <Link
              to="/professional-info#education"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <GraduationCap className="h-3 w-3" />
              Education
            </Link>
            <Link
              to="/professional-info#certifications"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <Award className="h-3 w-3" />
              Certifications
            </Link>
            <Link
              to="/professional-info#projects"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <FolderKanban className="h-3 w-3" />
              Projects
            </Link>
            <Link
              to="/professional-info#skills"
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs flex items-center gap-2"
            >
              <Code className="h-3 w-3" />
              Skills
            </Link>
          </div>
        )}
      </div>

      <Link
        to="/settings"
        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2"
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
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 break-words">
              Profile & Settings
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Manage your profile, professional information, and account settings
            </p>
          </div>

          <div className="w-full max-w-6xl mx-auto space-y-8">
            {/* Overview Dashboard */}
            <div id="overview" className="scroll-mt-20">
              <ProfileDashboard userId={session.user.id} />
            </div>

            {/* Basic Information */}
            <div id="basic-info" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-6 break-words">Basic Information</h2>
              <BasicInfoForm userId={session.user.id} />
            </div>

            {/* External Skill Platforms */}
            <div id="external-platforms" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-6 break-words">External Skill Platforms</h2>
              <ExternalSkillPlatforms userId={session.user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileAndSettings;
