import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsOfService = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Terms of Service</CardTitle>
          <p className="text-muted-foreground">Last updated: December 11, 2025</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using The Team job search platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">2. Description of Service</h2>
                <p>
                  The Team provides a comprehensive job search management platform that includes:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Job application tracking and management</li>
                  <li>Resume and cover letter creation tools</li>
                  <li>Interview preparation resources</li>
                  <li>Career goal setting and progress tracking</li>
                  <li>Networking and contact management</li>
                  <li>AI-powered recommendations and analysis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">3. User Accounts</h2>
                <p>
                  To use certain features of the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">4. User Content</h2>
                <p>
                  You retain ownership of content you submit, including resumes, cover letters, and personal information. By submitting content, you grant us a license to use, store, and process this content to provide the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Use the Service for any unlawful purpose</li>
                  <li>Share false or misleading information</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Use automated systems to access the Service without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">6. AI-Generated Content</h2>
                <p>
                  Our Service uses AI to generate suggestions for resumes, cover letters, and interview responses. This content is provided as guidance only. You are responsible for reviewing and editing all AI-generated content before use.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">7. Third-Party Services</h2>
                <p>
                  The Service may integrate with third-party platforms (LinkedIn, Gmail, GitHub, etc.). Your use of these integrations is subject to the respective third-party terms of service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
                <p>
                  The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Loss of data or content</li>
                  <li>Unsuccessful job applications</li>
                  <li>Errors in AI-generated content</li>
                  <li>Service interruptions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">9. Termination</h2>
                <p>
                  We reserve the right to suspend or terminate your account at any time for violations of these terms. You may delete your account at any time through the Settings page.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
                <p>
                  We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">11. Contact</h2>
                <p>
                  For questions about these Terms of Service, please contact us through the Settings page or email support.
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsOfService;
