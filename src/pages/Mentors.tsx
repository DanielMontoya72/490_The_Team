import { AppNav } from "@/components/layout/AppNav";
import { MentorDashboard } from "@/components/mentors/MentorDashboard";

export default function Mentors() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto py-8 px-4">
        <MentorDashboard />
      </div>
    </div>
  );
}
