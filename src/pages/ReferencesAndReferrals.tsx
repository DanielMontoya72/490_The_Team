import { useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { ContactSidebar } from "@/components/layout/ContactSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ReferenceList } from "@/components/references/ReferenceList";
import { ReferenceRequests } from "@/components/references/ReferenceRequests";
import { ReferencePortfolios } from "@/components/references/ReferencePortfolios";
import { ReferenceAnalytics } from "@/components/references/ReferenceAnalytics";
import { ReferralRequestManager } from "@/components/contacts/ReferralRequestManager";
import Events from "@/pages/Events";
import { Users, Send, FolderOpen, BarChart3, UserPlus, Sparkles, Bell, Linkedin, Coffee, Target, Network, Building2, UsersRound, Calendar } from "lucide-react";

export default function ReferencesAndReferrals() {
  const [activeTab, setActiveTab] = useState("references");
  const [eventsSheetOpen, setEventsSheetOpen] = useState(false);

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <ContactSidebar activeTab="references" />
        
        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden lg:ml-56">
          <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1600px] mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Professional References & Job Referrals</h1>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 References</h3>
                  <p className="text-blue-800 dark:text-blue-200">
                    People who can vouch for your work quality, skills, and character when employers contact them directly.
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🤝 Referrals</h3>
                  <p className="text-green-800 dark:text-green-200">
                    People in your network who can recommend you for specific job opportunities at their companies.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>References Section</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Referrals Section</span>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="grid w-full grid-cols-1 lg:grid-cols-5 gap-2 mb-8 p-1 bg-muted/30 rounded-lg">
                  {/* References Section */}
                  <button
                    onClick={() => setActiveTab("references")}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-all border-l-4 border-blue-500 ${
                      activeTab === "references" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">My</span> References
                  </button>
                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-all border-l-4 border-blue-500 ${
                      activeTab === "requests" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Reference <span className="hidden sm:inline">Requests</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("portfolios")}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-all border-l-4 border-blue-500 ${
                      activeTab === "portfolios" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FolderOpen className="h-4 w-4" />
                    Reference <span className="hidden sm:inline">Portfolios</span>
                  </button>
                  
                  {/* Referrals Section */}
                  <button
                    onClick={() => setActiveTab("referrals")}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-all border-l-4 border-green-500 ${
                      activeTab === "referrals" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Job <span className="hidden sm:inline">Referrals</span>
                  </button>
                  
                  {/* Analytics */}
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md text-sm font-medium transition-all border-l-4 border-purple-500 ${
                      activeTab === "analytics" 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </button>
                </div>

                <div className="mt-6">
                  {activeTab === "references" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h2 className="text-xl font-semibold">Professional References</h2>
                        <span className="text-sm text-muted-foreground">• People who can speak to your work quality</span>
                      </div>
                      <ReferenceList />
                    </div>
                  )}
                  {activeTab === "requests" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h2 className="text-xl font-semibold">Reference Requests</h2>
                        <span className="text-sm text-muted-foreground">• Track requests you've sent to potential references</span>
                      </div>
                      <ReferenceRequests />
                    </div>
                  )}
                  {activeTab === "portfolios" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h2 className="text-xl font-semibold">Reference Portfolios</h2>
                        <span className="text-sm text-muted-foreground">• Organized collections of your references for different roles</span>
                      </div>
                      <ReferencePortfolios />
                    </div>
                  )}
                  {activeTab === "referrals" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h2 className="text-xl font-semibold">Job Referrals</h2>
                        <span className="text-sm text-muted-foreground">• Request referrals for specific job opportunities</span>
                      </div>
                      <ReferralRequestManager />
                    </div>
                  )}
                  {activeTab === "analytics" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <h2 className="text-xl font-semibold">Performance Analytics</h2>
                        <span className="text-sm text-muted-foreground">• Track success rates and optimize your approach</span>
                      </div>
                      <ReferenceAnalytics />
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      {/* Events Sheet */}
      <Sheet open={eventsSheetOpen} onOpenChange={setEventsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Events</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Events />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}