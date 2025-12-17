import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { TextSizeProvider } from "@/components/text-size-provider";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileEnhanced = lazy(() => import("./pages/ProfileEnhanced"));
const ProfileAndSettings = lazy(() => import("./pages/ProfileAndSettings"));
const ProfessionalInfo = lazy(() => import("./pages/ProfessionalInfo"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Resumes = lazy(() => import("./pages/Resumes"));
const Teams = lazy(() => import("./pages/Teams"));
const MyTemplates = lazy(() => import("./pages/MyTemplates"));
const SharedResume = lazy(() => import("./pages/SharedResume"));
const SharedCoverLetter = lazy(() => import("./pages/SharedCoverLetter"));
const CoverLetters = lazy(() => import("./pages/CoverLetters"));
const CoverLetterEditorPage = lazy(() => import("./pages/CoverLetterEditorPage"));
const GitHubCallback = lazy(() => import("./pages/GitHubCallback"));
const JobMatchings = lazy(() => import("./pages/JobMatchings"));
const SkillDevelopment = lazy(() => import("./pages/SkillDevelopment"));
const Contacts = lazy(() => import("./pages/Contacts"));
const NetworkingCampaigns = lazy(() => import("./pages/NetworkingCampaigns"));
const Networking = lazy(() => import("./pages/Networking"));
const Mentors = lazy(() => import("./pages/Mentors"));
const MentorAccept = lazy(() => import("./pages/MentorAccept"));
const TechnicalPrep = lazy(() => import("./pages/TechnicalPrep"));
const JobSearchPerformance = lazy(() => import("./pages/JobSearchPerformance"));
const InterviewAnalytics = lazy(() => import("./pages/InterviewAnalytics"));
const Referrals = lazy(() => import("./pages/Referrals"));
const PerformanceAndImprovement = lazy(() => import("./pages/PerformanceAndImprovement"));
const CareerGoals = lazy(() => import("./pages/CareerGoals"));
const MarketIntelligence = lazy(() => import("./pages/MarketIntelligence"));
const ProductivityAnalysis = lazy(() => import("./pages/ProductivityAnalysis"));
const CompetitiveAnalysis = lazy(() => import("./pages/CompetitiveAnalysis"));
const ProgressSharing = lazy(() => import("./pages/ProgressSharing"));
const References = lazy(() => import("./pages/References"));
const ReferencesAndReferrals = lazy(() => import("./pages/ReferencesAndReferrals"));
const ReferenceResponse = lazy(() => import("./pages/ReferenceResponse"));
const Events = lazy(() => import("./pages/Events"));
const Stats = lazy(() => import("./pages/Stats"));
const FamilySupport = lazy(() => import("./pages/FamilySupport"));
const EnterpriseDashboard = lazy(() => import("./pages/EnterpriseDashboard"));
const ExternalAdvisors = lazy(() => import("./pages/ExternalAdvisors"));
const SalaryAnalytics = lazy(() => import("./pages/SalaryAnalytics"));
const PredictiveAnalytics = lazy(() => import("./pages/PredictiveAnalytics"));
const AnalyticsHub = lazy(() => import("./pages/AnalyticsHub"));
const MockInterview = lazy(() => import("./pages/MockInterview"));
const PreparationHub = lazy(() => import("./pages/PreparationHub"));
const DocManagement = lazy(() => import("./pages/DocManagement"));
const SuccessOptimization = lazy(() => import("./pages/SuccessOptimization"));
const ABTestingDashboard = lazy(() => import("./pages/ABTestingDashboard"));
const PlatformTracking = lazy(() => import("./pages/PlatformTracking"));
const ResponseLibrary = lazy(() => import("./pages/ResponseLibrary"));
const OfferComparison = lazy(() => import("./pages/OfferComparison"));
const MonitoringDashboard = lazy(() => import("./pages/MonitoringDashboard"));
const Documentation = lazy(() => import("./pages/Documentation"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const InterviewQuestionsBank = lazy(() => import("./pages/InterviewQuestionsBank"));
const JobMap = lazy(() => import("./pages/JobMap"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TextSizeProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile-enhanced" element={<ProfileEnhanced />} />
                <Route path="/profile-settings" element={<ProfileAndSettings />} />
                <Route path="/professional-info" element={<ProfessionalInfo />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/resumes" element={<Resumes />} />
                <Route path="/career-goals" element={<CareerGoals />} />
                <Route path="/market-intelligence" element={<MarketIntelligence />} />
                <Route path="/productivity-analysis" element={<ProductivityAnalysis />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/my-templates" element={<MyTemplates />} />
                <Route path="/shared/:shareId" element={<SharedResume />} />
                <Route path="/resume/shared/:shareToken" element={<SharedResume />} />
                <Route path="/cover-letter/shared/:shareToken" element={<SharedCoverLetter />} />
                <Route path="/cover-letters" element={<CoverLetters />} />
                <Route path="/cover-letter/edit" element={<CoverLetterEditorPage />} />
                <Route path="/auth/callback/github" element={<GitHubCallback />} />
                <Route path="/job-matchings" element={<JobMatchings />} />
                <Route path="/skill-development" element={<SkillDevelopment />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/campaigns" element={<NetworkingCampaigns />} />
                <Route path="/networking" element={<Networking />} />
                <Route path="/family-support" element={<FamilySupport />} />
                <Route path="/mentors" element={<Mentors />} />
                <Route path="/mentor/accept/:token" element={<MentorAccept />} />
                <Route path="/mentors/accept" element={<MentorAccept />} />
                <Route path="/technical-prep" element={<TechnicalPrep />} />
                <Route path="/job-search-performance" element={<JobSearchPerformance />} />
                <Route path="/interview-analytics" element={<InterviewAnalytics />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/performance-improvement" element={<PerformanceAndImprovement />} />
                <Route path="/competitive-analysis" element={<CompetitiveAnalysis />} />
                <Route path="/progress-sharing" element={<ProgressSharing />} />
                <Route path="/references" element={<References />} />
                <Route path="/references-and-referrals" element={<ReferencesAndReferrals />} />
                <Route path="/reference-response" element={<ReferenceResponse />} />
                <Route path="/events" element={<Events />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/enterprise" element={<EnterpriseDashboard />} />
                <Route path="/external-advisors" element={<ExternalAdvisors />} />
                <Route path="/salary-analytics" element={<SalaryAnalytics />} />
                <Route path="/predictive-analytics" element={<PredictiveAnalytics />} />
                <Route path="/analytics-hub" element={<AnalyticsHub />} />
                <Route path="/mock-interview" element={<MockInterview />} />
                <Route path="/preparation-hub" element={<PreparationHub />} />
                <Route path="/doc-management" element={<DocManagement />} />
                <Route path="/success-optimization" element={<SuccessOptimization />} />
                <Route path="/ab-testing" element={<ABTestingDashboard />} />
                <Route path="/platform-tracking" element={<PlatformTracking />} />
                <Route path="/response-library" element={<ResponseLibrary />} />
                <Route path="/offer-comparison" element={<OfferComparison />} />
                <Route path="/monitoring-dashboard" element={<MonitoringDashboard />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/getting-started" element={<GettingStarted />} />
                <Route path="/interview-questions" element={<InterviewQuestionsBank />} />
                <Route path="/job-map" element={<JobMap />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </SidebarProvider>
    </TextSizeProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
