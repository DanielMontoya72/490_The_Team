import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FAQ_CONTENT } from "@/data/seedData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles } from "lucide-react";
import { AppNav } from "@/components/layout/AppNav";
import { GettingStartedPopup } from "@/components/dashboard/GettingStartedPopup";
import { supabase } from "@/integrations/supabase/client";

const FAQ = () => {
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  return (
    <>
      <AppNav />
      
      {/* Getting Started Popup */}
      <GettingStartedPopup 
        isOpen={showGettingStarted}
        onClose={() => setShowGettingStarted(false)}
        userSession={session}
      />
      
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <HelpCircle className="h-8 w-8" />
                Frequently Asked Questions
              </h1>
              <p className="text-muted-foreground mt-2">
                Find answers to common questions about using the platform
              </p>
            </div>
            <Button
              onClick={() => setShowGettingStarted(true)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              Getting Started
            </Button>
          </div>

      {FAQ_CONTENT.map((category, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((item, qIdx) => (
                <AccordionItem key={qIdx} value={`${idx}-${qIdx}`}>
                  <AccordionTrigger className="text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

          <Card>
            <CardHeader>
              <CardTitle>Still Have Questions?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Check out our{" "}
                <a href="/documentation" className="text-primary hover:underline">
                  Production Documentation
                </a>{" "}
                for detailed guides, or reach out through the Settings page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default FAQ;
