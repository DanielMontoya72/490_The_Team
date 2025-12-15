import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu } from "lucide-react";

interface LeftSidebarProps {
  children?: ReactNode;
  className?: string;
  isCollapsed?: boolean;
}

export function LeftSidebar({ children, className, isCollapsed = false }: LeftSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Dropdown Toggle */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-3 rounded-none"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <span className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Navigation
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isMobileOpen ? 'rotate-180' : ''}`} />
        </Button>
        {isMobileOpen && (
          <div className="max-h-[60vh] overflow-y-auto p-4 border-t bg-background">
            {children}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r transition-all duration-300 z-40",
          isCollapsed ? "w-0 overflow-hidden" : "md:block w-64",
          className
        )}
      >
        <div className="h-full overflow-y-auto p-4">
          {children}
        </div>
      </aside>
    </>
  );
}
