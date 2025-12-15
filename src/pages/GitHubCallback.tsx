import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GitHubCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error("GitHub authentication failed");
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error("No authorization code received");
        navigate('/login');
        return;
      }

      try {
        // Call edge function to handle OAuth callback
        const { data, error: functionError } = await supabase.functions.invoke('github-oauth-callback', {
          body: { code }
        });

        if (functionError) throw functionError;

        if (data.success) {
          toast.success("Successfully signed in with GitHub!");
          navigate('/dashboard');
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error: any) {
        console.error('GitHub callback error:', error);
        toast.error(error.message || "Failed to complete GitHub authentication");
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing GitHub authentication...</p>
      </div>
    </div>
  );
};

export default GitHubCallback;
