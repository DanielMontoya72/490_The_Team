import { FAQ_CONTENT } from "@/data/seedData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-8 w-8" />
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground mt-2">
          Find answers to common questions about using the platform
        </p>
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
  );
};

export default FAQ;
