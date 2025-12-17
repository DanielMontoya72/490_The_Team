import { useState } from "react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/layout/AppNav";
import { ExternalAdvisorsDashboard } from "@/components/advisors/ExternalAdvisorsDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Events from "@/pages/Events";
import { Users, Send, GraduationCap, UsersRound, Calendar, UserCircle, Sparkles, Bell, Linkedin, Coffee, Target, Network, Building2, UserPlus } from "lucide-react";

export default function ExternalAdvisors() {
  const [eventsSheetOpen, setEventsSheetOpen] = useState(false);
  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        {/* Networking Quick Actions Sidebar - Mobile Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-b z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-white">Quick Actions</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-0 border-t bg-background/80 backdrop-blur-md">
              <Link
                to="/networking"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">My Contacts</span>
              </Link>
              <Link
                to="/enterprise"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Building2 className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Enterprise</span>
              </Link>
              <Link
                to="/references-and-referrals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <UserPlus className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">References & Referrals</span>
              </Link>
              <button
                onClick={() => setEventsSheetOpen(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Calendar className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Events</span>
              </button>
              <Link
                to="/networking?tab=discovery"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Discover</span>
              </Link>
              <Link
                to="/networking?tab=campaigns"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Campaigns</span>
              </Link>
              <Link
                to="/networking?tab=maintenance"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Maintenance</span>
              </Link>
              <Link
                to="/networking?tab=linkedin"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">LinkedIn</span>
              </Link>
              <Link
                to="/networking?tab=info-interviews"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Info Interviews</span>
              </Link>
              <Link
                to="/networking?tab=teams"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Teams Hub</span>
              </Link>
              <Link
                to="/networking?tab=peer-groups"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted/50 transition-colors group min-h-[40px]"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Community</span>
              </Link>
              <Link 
                to="/external-advisors"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Advisors</span>
              </Link>
            </div>
          </details>
        </aside>

        {/* Networking Quick Actions Sidebar - Desktop */}
        <aside className="hidden lg:block w-56 bg-card border-r overflow-y-auto flex-shrink-0">
          <div className="p-3 sticky top-16">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Quick Actions</h3>
            </div>
            <div className="space-y-0">
              <Link
                to="/networking"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">My Contacts</span>
              </Link>
              <Link
                to="/enterprise"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Building2 className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Enterprise</span>
              </Link>
              <Link
                to="/references-and-referrals"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <UserPlus className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">References & Referrals</span>
              </Link>
              <button
                onClick={() => setEventsSheetOpen(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Calendar className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Events</span>
              </button>
              <Link
                to="/networking?tab=discovery"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Sparkles className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Find Contacts</span>
              </Link>
              <Link
                to="/networking?tab=campaigns"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Send className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Campaigns</span>
              </Link>
              <Link
                to="/networking?tab=maintenance"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Bell className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Maintenance</span>
              </Link>
              <Link
                to="/networking?tab=linkedin"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Linkedin className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">LinkedIn</span>
              </Link>
              <Link
                to="/networking?tab=info-interviews"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Coffee className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Info Interviews</span>
              </Link>
              
              {/* Divider */}
              <div className="mx-2.5 border-t border-white/20"></div>
              
              <Link
                to="/networking?tab=teams"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <Users className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Teams Hub</span>
              </Link>
              <Link
                to="/networking?tab=peer-groups"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg hover:bg-muted transition-colors group min-h-[40px]"
              >
                <UsersRound className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate text-left leading-relaxed">Community</span>
              </Link>
              <Link 
                to="/external-advisors"
                className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg bg-primary/10 border border-primary/20 transition-colors group min-h-[40px]"
              >
                <Target className="h-4 w-4 text-primary transition-colors flex-shrink-0" />
                <span className="text-sm font-medium text-primary transition-colors truncate text-left leading-relaxed">Advisors</span>
              </Link>
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden lg:mt-0 mt-0">
          <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1600px] mx-auto">
            <ExternalAdvisorsDashboard />
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
