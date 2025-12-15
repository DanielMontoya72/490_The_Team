import { AppNav } from "@/components/layout/AppNav";
import { Code2 } from "lucide-react";
import TechnicalPrep from "./TechnicalPrep";

export default function PerformanceAndImprovement() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Code2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Technical Prep & Mock Interviews</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Practice coding challenges, prepare for technical interviews, and improve your skills
          </p>
        </div>

        <TechnicalPrep />
      </div>
    </div>
  );
}
