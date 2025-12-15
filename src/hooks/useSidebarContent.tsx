import { useEffect } from "react";
import { useSidebar } from "@/components/layout/SidebarContext";

/**
 * Hook to set sidebar content for a specific page
 * Usage: useSidebarContent(<YourSidebarContent />)
 */
export function useSidebarContent(content: React.ReactNode) {
  const { setSidebarContent } = useSidebar();

  useEffect(() => {
    setSidebarContent(content);
    
    // Cleanup: clear sidebar content when component unmounts
    return () => {
      setSidebarContent(null);
    };
  }, [content, setSidebarContent]);
}
