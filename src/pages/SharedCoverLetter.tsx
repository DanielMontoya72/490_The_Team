import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CoverLetterFeedbackPanel } from "@/components/coverletter/CoverLetterFeedbackPanel";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { CoverLetterShare } from "@/types/cover-letter-collaboration";

interface CoverLetter {
  id: string;
  file_url: string; // Contains the actual text content
  version_name: string;
  created_at: string;
}

export default function SharedCoverLetter() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<CoverLetterShare | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (shareToken) {
      loadSharedCoverLetter();
    }
  }, [shareToken]);

  // Set up realtime subscription for share updates
  useEffect(() => {
    if (!share) return;

    const channel = supabase
      .channel(`cover_letter_share:${share.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cover_letter_shares',
          filter: `id=eq.${share.id}`
        },
        (payload) => {
          console.log('Share updated:', payload);
          setShare(payload.new as CoverLetterShare);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [share?.id]);

  const loadSharedCoverLetter = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: shareData, error: shareError } = await (supabase as any)
        .from("cover_letter_shares")
        .select("*")
        .eq("share_token", shareToken)
        .eq("is_active", true)
        .maybeSingle();

      if (shareError) throw shareError;

      if (!shareData) {
        setError("This share link is invalid or has been deactivated.");
        return;
      }

      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError("This share link has expired.");
        return;
      }

      setShare(shareData as CoverLetterShare);

      const { data: coverLetterData, error: coverLetterError } = await supabase
        .from("application_materials")
        .select("id, file_url, version_name, created_at")
        .eq("id", shareData.cover_letter_id)
        .single();

      if (coverLetterError) throw coverLetterError;

      setCoverLetter(coverLetterData as CoverLetter);
    } catch (error: any) {
      console.error("Error loading shared cover letter:", error);
      setError("Failed to load the shared cover letter. Please try again.");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared cover letter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Unable to Load Cover Letter</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!coverLetter || !share) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{coverLetter.version_name}</h1>
              <p className="text-muted-foreground">
                {new Date(coverLetter.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html lang="en">
                      <head>
                        <style>
                          body {
                            font-family: 'Times New Roman', serif;
                            font-size: 12pt;
                            line-height: 1.6;
                            color: #000;
                            background: #fff;
                            padding: 2rem;
                            margin: 0;
                          }
                          p {
                            margin-bottom: 1em;
                            text-align: justify;
                          }
                          .content {
                            white-space: pre-wrap;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="content">${coverLetter.file_url.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br>').join('')}</div>
                      </body>
                    </html>
                  `}
                  className="w-full h-[600px] border-0 rounded-lg"
                  title="Cover Letter Preview"
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <CoverLetterFeedbackPanel
              coverLetterId={coverLetter.id}
              shareId={share.id}
              isOwner={false}
              allowComments={share.allow_comments}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
