import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppNav } from "@/components/layout/AppNav";
import { BasicInfoForm } from "@/components/profile/BasicInfoForm";
import { EmploymentHistory } from "@/components/profile/EmploymentHistory";
import { SkillsManagement } from "@/components/profile/SkillsManagement";
import { EducationHistory } from "@/components/profile/EducationHistory";
import { CertificationsManagement } from "@/components/profile/CertificationsManagement";
import { ProjectsManagement } from "@/components/profile/ProjectsManagement";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { ExternalSkillPlatforms } from "@/components/profile/ExternalSkillPlatforms";

const ProfileEnhanced = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <AppNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8 lg:py-12">
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            Professional Profile
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Build and manage your complete professional profile
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <TabsList className="flex flex-col sm:flex-row w-full max-w-full lg:max-w-[1000px] mx-auto bg-card border-b-2 border-primary mb-6 p-0 h-auto rounded-none overflow-x-auto">
            <TabsTrigger 
              value="overview" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="basic" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="employment" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Employment
            </TabsTrigger>
            <TabsTrigger 
              value="education" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Education
            </TabsTrigger>
            <TabsTrigger 
              value="certifications" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Certs
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger 
              value="skills" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Skills
            </TabsTrigger>
            <TabsTrigger 
              value="external" 
              className="w-full sm:w-auto text-xs sm:text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              External
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <ProfileDashboard userId={session.user.id} onNavigateToTab={setActiveTab} />
            </div>
          </TabsContent>

          <TabsContent value="basic" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <BasicInfoForm userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <EmploymentHistory userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="education" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <EducationHistory userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="certifications" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <CertificationsManagement userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <ProjectsManagement userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="skills" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <SkillsManagement userId={session.user.id} />
            </div>
          </TabsContent>

          <TabsContent value="external" className="animate-fade-in">
            <div className="bg-card rounded-lg border shadow-sm p-4 md:p-6 lg:p-8 w-full flex flex-col">
              <ExternalSkillPlatforms />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileEnhanced;
