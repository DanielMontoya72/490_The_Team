import { Button } from "@/components/ui/button";
import { Linkedin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInOAuthButtonProps {
  mode: 'login' | 'signup';
}

export const LinkedInOAuthButton = ({ mode }: LinkedInOAuthButtonProps) => {
  const handleLinkedInSignIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in first to connect LinkedIn");
        return;
      }
      
      const startUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-oauth-start?user_id=${user.id}`;
      window.location.href = startUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate LinkedIn sign in");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleLinkedInSignIn}
    >
      <Linkedin className="w-5 h-5 mr-2 text-blue-600" />
      {mode === 'login' ? 'Sign in with LinkedIn' : 'Sign up with LinkedIn'}
    </Button>
  );
};
