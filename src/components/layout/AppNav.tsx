import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, User, LogOut, Briefcase, FileText, Users, BarChart3, Brain, TrendingUp, BookOpen, Target, Share2, Mail, UserPlus, Monitor, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import theLogo from "@/assets/the-logo.png";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Profile & Settings", path: "/profile-settings", icon: User },
  { label: "Jobs", path: "/jobs", icon: Briefcase },
  { label: "Interview Prep", path: "/performance-improvement", icon: TrendingUp },
  { label: "Skills", path: "/skill-development", icon: BookOpen },
  { label: "Goals", path: "/career-goals", icon: Target },
  { label: "Progress", path: "/progress-sharing", icon: Share2 },
  { label: "Resumes", path: "/resumes", icon: FileText },
  { label: "Cover Letters", path: "/cover-letters", icon: Mail },
  { label: "Networking", path: "/networking", icon: Users },
  { label: "References", path: "/references", icon: UserPlus },
];

export function AppNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Skip to main content functionality
  const skipToMainContent = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView();
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchProfilePicture = async () => {
      try {
        // Only fetch profile if user is authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('users-me', {
          method: 'GET',
        });
        
        if (isMounted && data?.data?.profile_picture_url) {
          setProfilePictureUrl(data.data.profile_picture_url);
        }
      } catch {
        // Silently fail - profile picture is not critical
      }
    };
    
    fetchProfilePicture();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Failed to logout");
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isDocsActive = () => ["/resumes", "/cover-letters", "/doc-management", "/ab-testing", "/documentation", "/getting-started", "/faq"].includes(location.pathname);
  const isInterviewPrepActive = () => [
    "/preparation-hub",
    "/performance-improvement",
    "/skill-development",
    "/career-goals",
    "/progress-sharing",
    "/productivity-analysis",
    "/technical-prep",
    "/interview-questions"
  ].includes(location.pathname);
  const isNetworkingActive = () => [
    "/networking",
    "/referrals",
    "/references",
    "/teams",
    "/mentors",
    "/events",
    "/networking-campaigns",
    "/family-support",
    "/enterprise",
    "/external-advisors"
  ].includes(location.pathname);

  const NavLinks = ({ mobile = false }) => (
    <>
      <Link
        to="/dashboard"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isActive("/dashboard")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Dashboard</span>
      </Link>
      <Link
        to="/profile-settings"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isActive("/profile-settings")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <User className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Profile</span>
      </Link>
      <Link
        to="/jobs"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isActive("/jobs")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <Briefcase className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Jobs</span>
      </Link>
      <Link
        to="/analytics-hub"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          (isActive("/analytics-hub") || isActive("/stats") || isActive("/salary-analytics") || isActive("/predictive-analytics") || isActive("/offer-comparison") || isActive("/job-map"))
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <BarChart3 className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Analytics</span>
      </Link>
      <Link
        to="/preparation-hub"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isInterviewPrepActive()
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <Brain className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Preparation</span>
      </Link>
      <Link
        to="/networking"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isNetworkingActive()
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <Users className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Contacts</span>
      </Link>
      <Link
        to="/doc-management"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isActive("/doc-management")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <FileText className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">Docs</span>
      </Link>
      <Link
        to="/faq"
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-manipulation",
          mobile ? "min-h-[44px]" : "",
          isActive("/faq")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
        onClick={() => mobile && setIsOpen(false)}
      >
        <HelpCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">FAQ</span>
      </Link>
    </>
  );

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline focus:outline-none focus:ring-2 focus:ring-primary-foreground"
        onKeyDown={skipToMainContent}
        tabIndex={0}
      >
        Skip to main content
      </a>
      
      <nav 
        className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50 w-full border-b border-primary/90 shadow-lg"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="w-full px-3 sm:px-4 lg:px-6 flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link 
            to="/dashboard" 
            className="flex items-center flex-shrink-0"
            aria-label="Go to dashboard - The Team Logo"
          >
            <img 
              src={theLogo} 
              alt="The Team - Professional Job Search Platform Logo" 
              className="h-8 sm:h-10 w-auto object-contain"
              width="32"
              height="32"
              loading="eager"
              decoding="sync"
              style={{ 
                maxWidth: '32px', 
                maxHeight: '32px',
                objectFit: 'contain',
                imageRendering: 'auto'
              }}
            />
          </Link>

        {/* Desktop Navigation - Single row, switches to hamburger if doesn't fit */}
        <div className="hidden xl:flex flex-1 items-center justify-center mx-4">
          <div className="flex items-center gap-1 justify-center">
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                isActive("/dashboard")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/jobs"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                isActive("/jobs")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span>Jobs</span>
            </Link>
            <Link
              to="/analytics-hub"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                (isActive("/analytics-hub") || isActive("/stats") || isActive("/salary-analytics") || isActive("/predictive-analytics") || isActive("/offer-comparison") || isActive("/job-map"))
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
              )}
            >
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span>Analytics</span>
            </Link>
            <Link
              to="/preparation-hub"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                isInterviewPrepActive()
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
              )}
            >
              <Brain className="h-4 w-4 flex-shrink-0" />
              <span>Preparation</span>
            </Link>
            <Link
              to="/networking"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                isNetworkingActive()
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
              )}
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>Contacts</span>
            </Link>
            <Link
              to="/doc-management"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm whitespace-nowrap",
                isActive("/doc-management")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Docs</span>
            </Link>
          </div>
        </div>

        {/* Desktop/Tablet Profile and Notifications - Far Right */}
        <div className="hidden xl:flex items-center gap-1 flex-shrink-0">
          <NotificationBell />
          
          {/* FAQ Link */}
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/faq"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                  isActive("/faq")
                    ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
                aria-label="Frequently Asked Questions"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="hidden 2xl:inline text-sm">FAQ</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              <p>FAQ & Help</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Admin Only - Monitoring Dashboard */}
          <div className="mx-2 h-6 w-px bg-border" />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/monitoring-dashboard"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                  isActive("/monitoring-dashboard")
                    ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
                aria-label="Admin monitoring dashboard"
              >
                <Monitor className="h-5 w-5" />
                <span className="hidden 2xl:inline text-sm">Monitor</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              <p>Monitoring Dashboard (Admin)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/profile-settings"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                  (isActive("/profile-settings") || isActive("/profile-enhanced") || isActive("/settings"))
                    ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
                aria-label="Go to profile and settings"
              >
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-primary/30 hover:border-primary transition-all"
                  />
                ) : (
                  <User className="h-6 w-6" />
                )}
                <span className="hidden 2xl:inline text-sm">Profile</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              <p>Profile & Settings</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 px-2"
            aria-label="Logout from your account"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden 2xl:inline text-sm">Logout</span>
          </Button>
        </div>

        {/* Mobile/Tablet Hamburger Menu - All devices below XL */}
        <div className="xl:hidden flex items-center gap-2 flex-shrink-0">
          <NotificationBell />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/profile-settings"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 hover:scale-105 touch-manipulation",
                  (isActive("/profile-settings") || isActive("/settings") || isActive("/profile-enhanced"))
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
                aria-label="Go to profile and settings"
              >
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-primary/30 hover:border-primary transition-all"
                  />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              <p>Profile & Settings</p>
            </TooltipContent>
          </Tooltip>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
                aria-controls="mobile-navigation"
              >
                {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[280px] sm:w-[320px] px-4"
              aria-labelledby="mobile-nav-title"
              id="mobile-navigation"
            >
              <div className="flex flex-col gap-4 mt-8">
                <h2 id="mobile-nav-title" className="sr-only">Navigation Menu</h2>
                <nav role="navigation" aria-label="Mobile navigation">
                  <div className="space-y-2">
                    <NavLinks mobile />
                  </div>
                </nav>
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="flex items-center gap-2 justify-start w-full touch-manipulation min-h-[44px]"
                    aria-label="Logout from your account"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
    </>
  );
}
