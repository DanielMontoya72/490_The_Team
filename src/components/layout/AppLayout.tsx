import { ReactNode } from "react";
import { AppNav } from "./AppNav";
import { LeftSidebar } from "./LeftSidebar";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isCollapsed, sidebarContent } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="flex">
        <LeftSidebar isCollapsed={isCollapsed}>
          {sidebarContent}
        </LeftSidebar>
        <main
          className={cn(
            "flex-1 transition-all duration-300 pt-16",
            isCollapsed ? "ml-0" : "ml-64"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
