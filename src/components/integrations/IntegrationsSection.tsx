import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { GmailIntegrationCard } from "@/components/email/GmailIntegrationCard";
import { GitHubIntegrationCard } from "./GitHubIntegrationCard";

export const IntegrationsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  // Auto-scroll to integrations section when returning from OAuth
  useEffect(() => {
    const hasOAuthParams = 
      searchParams.get("gmail_success") || 
      searchParams.get("gmail_error") ||
      searchParams.get("github_success") ||
      searchParams.get("github_error");

    if (hasOAuthParams && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);

  return (
    <div ref={sectionRef} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Account Integrations</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Connect external services to enhance your job search experience
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <GmailIntegrationCard />
        <GitHubIntegrationCard />
      </div>
    </div>
  );
};
