import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, User, Settings, LogOut, Briefcase, FileText, Users, Layout, Mail, Target, BookOpen, Code2, TrendingUp, BarChart3, Clock, Award, Share2, UserPlus, ChevronDown, Calendar, Heart, Building2, GraduationCap, DollarSign, Sparkles, FlaskConical, Layers, Scale, Activity, Book, MessageSquare, HelpCircle, Rocket, Map } from "lucide-react";
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

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('users-me', {
          method: 'GET',
        });
        if (data?.data?.profile_picture_url) {
          setProfilePictureUrl(data.data.profile_picture_url);
        }
      } catch (error) {
        console.error('Failed to fetch profile picture:', error);
      }
    };
    fetchProfilePicture();
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
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive("/dashboard")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Dashboard</span>
      </Link>
      <Link
        to="/profile-enhanced"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive("/profile-enhanced")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
      >
        <User className="h-5 w-5" />
        <span>Profile</span>
      </Link>
      <Link
        to="/jobs"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive("/jobs")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
      >
        <Briefcase className="h-5 w-5" />
        <span>Jobs</span>
      </Link>
      <Link
        to="/platform-tracking"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive("/platform-tracking")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
      >
        <Layers className="h-5 w-5" />
        <span>Platforms</span>
      </Link>
      <Link
        to="/response-library"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          isActive("/response-library")
            ? "bg-primary text-primary-foreground font-semibold"
            : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
        )}
      >
        <BookOpen className="h-5 w-5" />
        <span>Responses</span>
      </Link>
    </>
  );

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50 w-full border-b">
      <div className="w-full px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center flex-shrink-0">
          <img src={theLogo} alt="The Team Logo" className="h-10 w-auto object-contain" />
        </Link>

        {/* Desktop Navigation - Centered */}
        <div className="hidden md:flex flex-1 items-center justify-center mx-4">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                isActive("/dashboard")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/jobs"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                isActive("/jobs")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <Briefcase className="h-5 w-5" />
              <span>Jobs</span>
            </Link>
            <Link
              to="/platform-tracking"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                isActive("/platform-tracking")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <Layers className="h-5 w-5" />
              <span>Platforms</span>
            </Link>
            <Link
              to="/response-library"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
                isActive("/response-library")
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70"
              )}
            >
              <BookOpen className="h-5 w-5" />
              <span>Responses</span>
            </Link>
            {/* Analytics Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 outline-none",
                  (isActive("/stats") || isActive("/salary-analytics") || isActive("/predictive-analytics") || isActive("/offer-comparison") || isActive("/job-map"))
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/stats" className="flex items-center gap-2 cursor-pointer">
                    <BarChart3 className="h-4 w-4" />
                    <span>Job Stats</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/salary-analytics" className="flex items-center gap-2 cursor-pointer">
                    <DollarSign className="h-4 w-4" />
                    <span>Salary Analytics</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/predictive-analytics" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                    <span>Predictive Analytics</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/offer-comparison" className="flex items-center gap-2 cursor-pointer">
                    <Scale className="h-4 w-4" />
                    <span>Offer Comparison</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/monitoring" className="flex items-center gap-2 cursor-pointer">
                    <Activity className="h-4 w-4" />
                    <span>Monitoring</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/job-map" className="flex items-center gap-2 cursor-pointer">
                    <Map className="h-4 w-4" />
                    <span>Job Map</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Interview Prep Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 outline-none",
                  isInterviewPrepActive()
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                <TrendingUp className="h-5 w-5" />
                <span>Preparation</span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/skill-development" className="flex items-center gap-2 cursor-pointer">
                    <BookOpen className="h-4 w-4" />
                    <span>Skills</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/career-goals" className="flex items-center gap-2 cursor-pointer">
                    <Target className="h-4 w-4" />
                    <span>Goals</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/mock-interview" className="flex items-center gap-2 cursor-pointer">
                    <Briefcase className="h-4 w-4" />
                    <span>Mock Interview</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/progress-sharing" className="flex items-center gap-2 cursor-pointer">
                    <Share2 className="h-4 w-4" />
                    <span>Progress</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/productivity-analysis" className="flex items-center gap-2 cursor-pointer">
                    <Clock className="h-4 w-4" />
                    <span>Productivity</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/technical-prep" className="flex items-center gap-2 cursor-pointer">
                    <Code2 className="h-4 w-4" />
                    <span>Technical Prep</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/interview-questions" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    <span>Questions Bank</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Contacts Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 outline-none",
                  isNetworkingActive()
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                <Users className="h-5 w-5" />
                <span>Contacts</span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/networking" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    <span>Networking</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/referrals" className="flex items-center gap-2 cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    <span>Referrals</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/references" className="flex items-center gap-2 cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    <span>References</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/teams" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    <span>Teams</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/mentors" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Mentors</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/events" className="flex items-center gap-2 cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    <span>Events</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/networking-campaigns" className="flex items-center gap-2 cursor-pointer">
                    <TrendingUp className="h-4 w-4" />
                    <span>Campaigns</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/family-support" className="flex items-center gap-2 cursor-pointer">
                    <Heart className="h-4 w-4" />
                    <span>Family Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/enterprise" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    <span>Enterprise</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/external-advisors" className="flex items-center gap-2 cursor-pointer">
                    <GraduationCap className="h-4 w-4" />
                    <span>Advisors</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Docs Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 outline-none",
                  isDocsActive()
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                <FileText className="h-5 w-5" />
                <span>Docs</span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/doc-management" className="flex items-center gap-2 cursor-pointer">
                    <Layout className="h-4 w-4" />
                    <span>Doc Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/resumes" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    <span>Resumes</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cover-letters" className="flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4" />
                    <span>Cover Letters</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/ab-testing" className="flex items-center gap-2 cursor-pointer">
                    <FlaskConical className="h-4 w-4" />
                    <span>A/B Testing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/documentation" className="flex items-center gap-2 cursor-pointer">
                    <Book className="h-4 w-4" />
                    <span>Production Docs</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/getting-started" className="flex items-center gap-2 cursor-pointer">
                    <Rocket className="h-4 w-4" />
                    <span>Getting Started</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/faq" className="flex items-center gap-2 cursor-pointer">
                    <HelpCircle className="h-4 w-4" />
                    <span>FAQ</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Notifications, Settings and Logout - Far Right */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <NotificationBell />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/profile-settings"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                  (isActive("/profile-settings") || isActive("/profile-enhanced") || isActive("/settings"))
                    ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="h-6 w-6 rounded-full object-cover border-2 border-primary/30 hover:border-primary transition-all"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
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
            className="ml-1.5 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Mobile Navigation - Far Right */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          <NotificationBell />
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Link
                to="/profile-settings"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 hover:scale-105",
                  (isActive("/profile-settings") || isActive("/settings") || isActive("/profile-enhanced"))
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : "hover:bg-muted text-foreground hover:ring-2 hover:ring-yellow-400 hover:ring-opacity-70 colorblind:hover:ring-blue-400"
                )}
              >
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="h-6 w-6 rounded-full object-cover border-2 border-primary/30 hover:border-primary transition-all"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              <p>Profile & Settings</p>
            </TooltipContent>
          </Tooltip>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks mobile />
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="flex items-center gap-2 justify-start"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
