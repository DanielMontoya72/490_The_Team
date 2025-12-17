import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Brain, 
  BookOpen, 
  Target, 
  Users, 
  Code2, 
  Clock, 
  MessageSquare, 
  ChevronRight 
} from 'lucide-react';

interface PreparationSidebarProps {
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
  { key: 'overview', icon: Brain, label: 'Hub Overview', path: '/preparation-hub' },
  { key: 'skills', icon: BookOpen, label: 'Skills', path: '/preparation-hub?tab=skills' },
  { key: 'goals', icon: Target, label: 'Goals', path: '/preparation-hub?tab=goals' },
  { key: 'mock-interview', icon: Users, label: 'Mock Interview', path: '/mock-interview' },
  { key: 'technical', icon: Code2, label: 'Technical Prep', path: '/preparation-hub?tab=technical' },
  { key: 'productivity', icon: Clock, label: 'Productivity', path: '/preparation-hub?tab=productivity' },
  { key: 'responses', icon: MessageSquare, label: 'Response Library', path: '/preparation-hub?tab=responses' },
];

export function PreparationSidebar({ activeTab = 'overview', onTabChange }: PreparationSidebarProps) {
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
              <Brain className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Preparation Hub</h3>
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
            <Brain className="h-4 w-4 text-primary flex-shrink-0" />
            <h3 className="font-bold text-base text-white">Preparation Hub</h3>
          </div>
          <div className="space-y-1">
            {navigationItems.map(renderNavItem)}
          </div>
        </div>
      </aside>
    </>
  );
}