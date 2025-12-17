import { AppNav } from "@/components/layout/AppNav";
import { NetworkingOpportunities } from "@/components/contacts/NetworkingOpportunities";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventsProps {
  onClose?: () => void;
}

export default function Events({ onClose }: EventsProps) {
  return (
    <>
      <AppNav />
      
      <div className="min-h-screen bg-background pt-16">
        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl">
              {/* Header Section */}
              <div className="mb-6 lg:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold">Networking Events</h1>
                      <p className="text-muted-foreground mt-1">
                        Discover and manage professional networking opportunities
                      </p>
                    </div>
                  </div>
                  {onClose && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="h-8 w-8 sm:hidden flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Events Content - Full Width */}
              <div className="w-full">
                <NetworkingOpportunities />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
