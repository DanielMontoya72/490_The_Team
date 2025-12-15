import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ReferenceResponse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [action, setAction] = useState<string>("");
  const [referenceName, setReferenceName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    const actionParam = searchParams.get("action");

    if (!requestId || !actionParam) {
      setStatus("error");
      setErrorMessage("Invalid link. Missing required parameters.");
      return;
    }

    setAction(actionParam);
    handleResponse(requestId, actionParam);
  }, [searchParams]);

  const handleResponse = async (requestId: string, action: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-reference-response", {
        body: { requestId, action },
      });

      if (error) throw error;

      setReferenceName(data.referenceName || "");
      setStatus("success");
    } catch (error: any) {
      console.error("Error:", error);
      setStatus("error");
      setErrorMessage(error.message || "Failed to process your response");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reference Response</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing your response...</p>
            </div>
          )}

          {status === "success" && action === "confirmed" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-600">Thank You!</h3>
              <p className="text-muted-foreground">
                You have confirmed to provide a reference. The requester has been notified.
              </p>
            </div>
          )}

          {status === "success" && action === "declined" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-red-600">Response Recorded</h3>
              <p className="text-muted-foreground">
                You have declined to provide a reference. The requester has been notified.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-destructive">Error</h3>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">You can close this page now.</p>
        </CardContent>
      </Card>
    </div>
  );
}
