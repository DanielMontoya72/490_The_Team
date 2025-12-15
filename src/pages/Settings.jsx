import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { TextSizeSelector } from "@/components/ui/text-size-selector";
import { toast } from "sonner";
import { AppNav } from "@/components/layout/AppNav";
import { ChevronDown, Trash2, AlertTriangle } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <AppNav />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
            Account Settings
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Manage your account preferences and data
          </p>
        </div>

        {/* Theme Selection */}
        <div className="mb-8">
          <ThemeSelector />
        </div>

        {/* Text Size Selection */}
        <div className="mb-8">
          <TextSizeSelector />
        </div>

        {/* Account Actions Dropdown */}
        <Card className="max-w-2xl mx-auto border-2 border-destructive/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl md:text-2xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-base">
              Irreversible actions that permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive mb-2">⚠️ Critical Warning</h4>
                    <p className="text-sm text-destructive/90">
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
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Account Management Actions
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-[400px]" align="center">
                  <div className="p-3 border-b bg-destructive/5">
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      These actions cannot be undone
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer p-3"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            <span className="font-medium">Delete Account</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Permanently remove your account and all data
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2 my-4">
                        <Label htmlFor="confirm-password">Enter your password to confirm</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Your password"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPassword("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || !password}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      </main>
    </div>
  );
};

export default Settings;
