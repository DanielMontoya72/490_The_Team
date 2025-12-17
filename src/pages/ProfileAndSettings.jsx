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

      <div className="pt-24">
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
            aria-label={isProfessionalInfoExpanded ? "Collapse Professional Info menu" : "Expand Professional Info menu"}
            aria-expanded={isProfessionalInfoExpanded}
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
        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center gap-2 mt-10"
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
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-gradient-to-br from-background to-muted pt-16">
        {/* Left Sidebar - Mobile Dropdown */}
        <aside className="xl:hidden fixed left-0 top-16 right-0 bg-card/70 backdrop-blur-lg border-b border-primary/90 shadow-lg z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" aria-label="Toggle navigation menu">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-foreground">Navigate</h3>
              </div>
              <svg className="h-4 w-6 transition-transform group-open:rotate-180 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-2 border-t bg-background/80 backdrop-blur-md">
              {sidebarContent}
            </div>
          </details>
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden xl:block w-64 bg-card/70 backdrop-blur-lg border-r border-primary/90 shadow-lg">
          <div className="p-6 h-full overflow-y-auto">
            {sidebarContent}
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 xl:w-[calc(100%-16rem)] p-4 md:p-6 lg:p-8 pt-20 xl:pt-16 overflow-auto">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-6 md:mb-8 animate-fade-in">
              <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2">
                Profile & Settings
              </h1>
              <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
                Manage your profile, professional information, and account settings
              </p>
            </div>

            <div className="space-y-6 md:space-y-8 w-full">
              {/* Overview Dashboard */}
              <div id="overview" className="scroll-mt-20">
                <ProfileDashboard userId={session.user.id} />
              </div>

              {/* Basic Information */}
              <div id="basic-info" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Basic Information</h2>
                <BasicInfoForm userId={session.user.id} />
              </div>

              {/* External Skill Platforms */}
              <div id="external-platforms" className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 scroll-mt-20">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">External Skill Platforms</h2>
                <ExternalSkillPlatforms userId={session.user.id} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ProfileAndSettings;
