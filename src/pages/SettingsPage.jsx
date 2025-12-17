import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { TextSizeSelector } from "@/components/ui/text-size-selector";
import { toast } from "sonner";
import { AppNav } from "@/components/layout/AppNav";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { ChevronDown, Trash2, AlertTriangle, Settings as SettingsIcon, Palette, Type, User, Briefcase, ChevronRight, FileText, GraduationCap, Award, FolderKanban, Code } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfessionalInfoExpanded, setIsProfessionalInfoExpanded] = useState(false);

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

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2 px-3">Settings:</p>
        
        <button
          onClick={() => document.getElementById('theme')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Palette className="h-4 w-4 inline mr-2" />
          Theme
        </button>
        <button
          onClick={() => document.getElementById('text-size')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Type className="h-4 w-4 inline mr-2" />
          Text Size
        </button>
        <button
          onClick={() => document.getElementById('danger-zone')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Danger Zone
        </button>
      </div>
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

  const handleDeleteAccount = async () => {
    if (!session || !password) {
      toast.error("Please enter your password to confirm deletion");
      return;
    }

    setIsDeleting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: password,
      });

      if (signInError) {
        toast.error("Invalid password");
        setIsDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase.rpc('delete_user');

      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setPassword("");
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden">
      <AppNav />
      <LeftSidebar>
        {sidebarContent}
      </LeftSidebar>
      
      <main className="pt-16 md:pt-6 md:ml-64 w-full">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 break-words">
              Settings & Preferences
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              Customize your experience and manage your account
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Theme Selection */}
          <div id="theme" className="scroll-mt-20">
            <ThemeSelector />
          </div>

          {/* Text Size Selection */}
          <div id="text-size" className="scroll-mt-20">
            <TextSizeSelector />
          </div>

            {/* Account Actions - Danger Zone */}
            <div id="danger-zone" className="scroll-mt-20 w-full">
              <Card className="border-2 border-destructive/50 shadow-lg w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg sm:text-xl md:text-2xl flex items-center gap-2 break-words">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Irreversible actions that permanently affect your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 w-full">
                    {/* Warning Banner */}
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4 w-full">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-destructive mb-2 text-sm sm:text-base break-words">⚠️ Critical Warning</h4>
                          <p className="text-xs sm:text-sm text-destructive/90">
                            The actions below will permanently delete your account and all associated data. 
                            This cannot be undone. Please proceed with extreme caution.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Account Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="lg"
                          className="w-full flex items-center justify-between text-sm sm:text-base"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Trash2 className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">Account Management Actions</span>
                          </span>
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-full sm:min-w-[400px] max-w-md" align="center">
                        <div className="p-2 sm:p-3 border-b bg-destructive/5">
                          <p className="text-xs text-destructive font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">These actions cannot be undone</span>
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive cursor-pointer p-2 sm:p-3"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <div className="flex flex-col items-start w-full min-w-0">
                                <div className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                                  <span className="font-medium text-sm sm:text-base">Delete Account</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Permanently remove your account and all data
                                </p>
                              </div>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md mx-4">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
                                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                <span className="break-words">Are you absolutely sure?</span>
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                This action cannot be undone. This will permanently delete your
                                account and remove all your data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2 my-4">
                              <Label htmlFor="confirm-password" className="text-sm sm:text-base">Enter your password to confirm</Label>
                              <Input
                                id="confirm-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Your password"
                                className="text-sm sm:text-base w-full"
                              />
                            </div>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel onClick={() => setPassword("")} className="w-full sm:w-auto">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || !password}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                              >
                                {isDeleting ? "Deleting..." : "Delete Account"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
