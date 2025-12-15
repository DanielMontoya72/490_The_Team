import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PublicNav } from "@/components/layout/PublicNav";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      <PublicNav />
      <div className="flex flex-col items-center justify-center flex-1 px-4">
        <div className="text-center space-y-4 sm:space-y-6 p-4 sm:p-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Welcome to ATS Platform</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground pb-6 sm:pb-12">
            Streamline your hiring process with our Applicant Tracking System
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/register")} className="w-full sm:w-auto">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="w-full sm:w-auto">
              Login
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-background/80 backdrop-blur border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">ATS Platform</span>
                <span>© 2025</span>
              </div>
              <div className="hidden md:block">|</div>
              <span>Streamlining recruitment for modern teams</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="mailto:theteamnjit5@gmail.com" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
