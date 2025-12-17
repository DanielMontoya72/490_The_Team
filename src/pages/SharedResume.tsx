import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SimpleResumeTemplate from "@/components/resume/SimpleResumeTemplate";
import { ResumeFeedbackPanel } from "@/components/resume/ResumeFeedbackPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ResumeShare } from "@/types/resume-collaboration";

interface Resume {
  id: string;
  resume_name: string;
  content: any;
  customization_overrides: any;
  template_id: string | null;
}

export default function SharedResume() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<ResumeShare | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (shareToken) {
      loadSharedResume();
    }
  }, [shareToken]);

  const loadSharedResume = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load the share
      const { data: shareData, error: shareError } = await (supabase as any)
        .from("resume_shares")
        .select("*")
        .eq("share_token", shareToken)
        .eq("is_active", true)
        .maybeSingle();

      if (shareError) throw shareError;

      if (!shareData) {
        setError("This share link is invalid or has been deactivated.");
        return;
      }

      // Check if expired
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError("This share link has expired.");
        return;
      }

      setShare(shareData as ResumeShare);

      // Load the resume
      const { data: resumeData, error: resumeError } = await supabase
        .from("resumes")
        .select("id, resume_name, content, customization_overrides, template_id")
        .eq("id", shareData.resume_id)
        .single();

      if (resumeError) throw resumeError;

      setResume(resumeData as Resume);
    } catch (error: any) {
      console.error("Error loading shared resume:", error);
      setError("Failed to load the shared resume. Please try again.");
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
          <p className="text-muted-foreground">Loading shared resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Unable to Load Resume</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.href = "/"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!resume || !share) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{resume.resume_name}</h1>
              <p className="text-muted-foreground">Shared Resume</p>
              {share.allow_comments && (
                <p className="text-sm text-muted-foreground mt-2">
                  💬 Comments are enabled - anyone can leave feedback
                </p>
              )}
            </div>

            <div className="bg-card rounded-lg border p-6">
              <SimpleResumeTemplate
                data={{
                  personalInfo: {
                    name: `${resume.content?.profile?.first_name || ''} ${resume.content?.profile?.last_name || ''}`.trim(),
                    email: resume.content?.profile?.email || '',
                    phone: resume.content?.profile?.phone || '',
                    location: resume.content?.profile?.location || '',
                    headline: resume.content?.profile?.headline || '',
                    linkedin: resume.content?.profile?.linkedin || '',
                  },
                  summary: resume.content?.summary || '',
                  skills: Array.isArray(resume.content?.skills)
                    ? resume.content.skills.map((s: any) => typeof s === 'string' ? s : s.skill_name || '')
                    : [],
                  experience: resume.content?.employment || [],
                  education: resume.content?.education || [],
                  additional: resume.content?.additional || '',
                }}
                primaryColor={resume.customization_overrides?.primaryColor || '#2563eb'}
                templateStyle={resume.customization_overrides?.templateStyle || 'classic'}
              />
            </div>
          </div>

          <div>
            <ResumeFeedbackPanel
              resumeId={resume.id}
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
