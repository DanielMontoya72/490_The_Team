import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">Last updated: December 11, 2025</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold">1. Information We Collect</h2>
                <p>We collect information you provide directly, including:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Account Information:</strong> Name, email address, password</li>
                  <li><strong>Profile Data:</strong> Work experience, education, skills, certifications</li>
                  <li><strong>Job Search Data:</strong> Applications, companies, interview details</li>
                  <li><strong>Documents:</strong> Resumes, cover letters, portfolios</li>
                  <li><strong>Communications:</strong> Messages with mentors, advisors, team members</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide and improve our Service</li>
                  <li>Generate personalized AI recommendations</li>
                  <li>Track your job search progress and analytics</li>
                  <li>Send notifications about your applications</li>
                  <li>Communicate important service updates</li>
                  <li>Provide customer support</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">3. Data Sharing</h2>
                <p>We do not sell your personal data. We may share information:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>With your consent:</strong> When you share with mentors, teams, or advisors</li>
                  <li><strong>Service providers:</strong> Cloud hosting, analytics, email services</li>
                  <li><strong>Legal requirements:</strong> When required by law or to protect rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">4. Third-Party Integrations</h2>
                <p>When you connect third-party services (LinkedIn, Gmail, GitHub), we access only the data necessary to provide features you've enabled. You can revoke access at any time through Settings.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">5. Data Security</h2>
                <p>We implement industry-standard security measures:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication with password hashing</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and authentication</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">6. Data Retention</h2>
                <p>
                  We retain your data as long as your account is active. Upon account deletion, we remove your personal data within 30 days, except where retention is required by law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Access:</strong> Request a copy of your data</li>
                  <li><strong>Correction:</strong> Update inaccurate information</li>
                  <li><strong>Deletion:</strong> Delete your account and data</li>
                  <li><strong>Export:</strong> Download your data in standard formats</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">8. Cookies and Tracking</h2>
                <p>
                  We use essential cookies for authentication and session management. Analytics cookies help us understand how you use the Service to make improvements.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">9. AI and Automated Processing</h2>
                <p>
                  Our AI features analyze your data to provide personalized recommendations. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Resume and cover letter suggestions</li>
                  <li>Interview preparation recommendations</li>
                  <li>Job match scoring</li>
                  <li>Career insights and analytics</li>
                </ul>
                <p>You can disable AI features in your Settings.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">10. Children's Privacy</h2>
                <p>
                  Our Service is not intended for users under 16 years of age. We do not knowingly collect data from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">12. Contact Us</h2>
                <p>
                  For privacy-related questions or to exercise your rights, contact us through the Settings page or email our privacy team.
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
