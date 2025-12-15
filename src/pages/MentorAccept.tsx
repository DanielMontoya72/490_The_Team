import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const MentorAccept = () => {
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  
  // Support both URL formats: /mentor/accept/:token and /mentors/accept?token=...
  const token = paramToken || searchParams.get("token");

  useEffect(() => {
    const acceptInvitation = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid invitation link - missing token");
        return;
      }

      try {
        // Call the public edge function to accept the invitation
        const { data, error } = await supabase.functions.invoke('accept-mentor-invitation', {
          body: { token }
        });

        if (error) {
          console.error('Edge function error:', error);
          setStatus("error");
          setMessage(error.message || "Failed to accept invitation");
          return;
        }

        if (data?.error) {
          setStatus("error");
          setMessage(data.error);
          return;
        }

        setStatus("success");
        setMessage(`Thank you! Your invitation has been accepted. ${data?.mentorName ? `Welcome, ${data.mentorName}!` : ''}`);

      } catch (error: any) {
        console.error("Error accepting invitation:", error);
        setStatus("error");
        setMessage(error.message || "Failed to accept invitation");
      }
    };

    acceptInvitation();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <div className="rounded-full bg-primary/10 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            )}
            {status === "success" && (
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="rounded-full bg-destructive/10 p-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Processing..."}
            {status === "success" && "Thank You!"}
            {status === "error" && "Oops!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">{message}</p>
          
          {status === "success" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The user who invited you has been notified.
              </p>
              <p className="text-sm text-primary font-medium">
                To communicate with your mentee and track their progress, please login or register for an account.
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <a href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Login
                </a>
                <a href="/register" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                  Register
                </a>
              </div>
            </div>
          )}

          {status === "loading" && (
            <p className="text-sm text-muted-foreground">
              Please wait while we process your response...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorAccept;
