import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Network, 
  Users, 
  Building2, 
  UserPlus, 
  Calendar, 
  Sparkles, 
  Send, 
  Bell, 
  Linkedin, 
  Coffee, 
  Target, 
  UsersRound,
  ChevronRight 
} from 'lucide-react';

interface ContactSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface NavItem {
  key: string;
  icon: React.ElementType;
  label: string;
  path?: string;
}

const navigationItems: NavItem[] = [
  { key: 'contacts', icon: Users, label: 'My Contacts', path: '/networking' },
  { key: 'enterprise', icon: Building2, label: 'Enterprise', path: '/enterprise' },
  { key: 'references', icon: UserPlus, label: 'References & Referrals', path: '/references-and-referrals' },
  { key: 'events', icon: Calendar, label: 'Events', path: '/events' },
  { key: 'discovery', icon: Sparkles, label: 'Find Contacts', path: '/contacts?tab=discovery' },
  { key: 'campaigns', icon: Send, label: 'Campaigns', path: '/campaigns' },
  { key: 'maintenance', icon: Bell, label: 'Maintenance', path: '/contacts?tab=maintenance' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', path: '/contacts?tab=linkedin' },
  { key: 'info-interviews', icon: Coffee, label: 'Info Interviews', path: '/contacts?tab=interviews' },
  { key: 'teams', icon: Users, label: 'Teams Hub', path: '/teams' },
  { key: 'community', icon: UsersRound, label: 'Community', path: '/contacts?tab=peer-groups' },
  { key: 'advisors', icon: Target, label: 'Advisors', path: '/external-advisors' },
];

export function ContactSidebar({ activeTab, onTabChange }: ContactSidebarProps) {
  const location = useLocation();

  const isCurrentPage = (path: string) => location.pathname === path;

  const handleItemClick = (item: NavItem) => {
    if (item.path) {
      // For pages with routes, let Link handle navigation
      return;
    }
    // For tabs within the same page, use onTabChange
    if (onTabChange) {
      onTabChange(item.key);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = item.path ? isCurrentPage(item.path) : activeTab === item.key;
    const Icon = item.icon;

    const className = `w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg transition-colors group min-h-[40px] ${
      isActive 
        ? 'bg-primary/10 border border-primary/20' 
        : 'hover:bg-muted lg:hover:bg-muted/50'
    }`;

    const iconClassName = `h-4 w-4 transition-colors flex-shrink-0 ${
      isActive ? 'text-primary' : 'text-white'
    }`;

    const textClassName = `text-sm font-medium transition-colors truncate text-left leading-relaxed ${
      isActive 
        ? 'text-primary' 
        : 'text-white group-hover:text-primary'
    }`;

    const content = (
      <>
        <Icon className={iconClassName} />
        <span className={textClassName}>{item.label}</span>
      </>
    );

    if (item.path) {
      return (
        <Link key={item.key} to={item.path} className={className}>
          {content}
        </Link>
      );
    }

    return (
      <button key={item.key} onClick={() => handleItemClick(item)} className={className}>
        {content}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Dropdown */}
      <aside className="lg:hidden fixed left-0 top-16 right-0 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-b border-yellow-400/90 shadow-lg z-40">
        <details className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Contact Hub</h3>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4 space-y-1 bg-card border-t">
            {navigationItems.map(renderNavItem)}
          </div>
        </details>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-56 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 border-r border-yellow-400/90 shadow-lg flex-shrink-0 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-30">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Network className="h-4 w-4 text-primary flex-shrink-0" />
            <h3 className="font-bold text-base text-white">Contact Hub</h3>
          </div>
          <div className="space-y-1">
            {navigationItems.map(renderNavItem)}
          </div>
        </div>
      </aside>
    </>
  );
}