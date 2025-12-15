import { Link } from "react-router-dom";
import { GETTING_STARTED_STEPS } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, ArrowRight } from "lucide-react";

const GettingStarted = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Rocket className="h-10 w-10 text-primary" />
          Getting Started
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Welcome! Follow these steps to set up your job search command center and start landing your dream job.
        </p>
      </div>

      <div className="space-y-4">
        {GETTING_STARTED_STEPS.map((step, idx) => (
          <Card key={idx} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {step.step}
                  </div>
                  <div>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription className="mt-1">{step.description}</CardDescription>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to={step.path} className="flex items-center gap-2">
                    {step.action}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Pro Tips for Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Be consistent:</strong> Update your job applications daily to keep track of progress and deadlines.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Use AI features:</strong> Let our AI help you tailor resumes and cover letters for each application.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Practice interviews:</strong> Use the mock interview feature regularly to build confidence.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Track everything:</strong> The more data you add, the better insights and recommendations you'll receive.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Network actively:</strong> Use the Contacts and Networking features to build relationships.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center space-y-4 pt-4">
        <p className="text-muted-foreground">
          Need more help? Check out our{" "}
          <Link to="/faq" className="text-primary hover:underline">FAQ</Link>{" "}
          or{" "}
          <Link to="/documentation" className="text-primary hover:underline">Documentation</Link>.
        </p>
        <Button asChild size="lg">
          <Link to="/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default GettingStarted;
