import { COVER_LETTER_TEMPLATES } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Briefcase, Sparkles, UserPlus, Users, Check } from "lucide-react";

const TONE_ICONS = {
  formal: Briefcase,
  enthusiastic: Sparkles,
  confident: UserPlus,
  warm: Users
};

interface CoverLetterTemplatesShowcaseProps {
  onSelectTemplate?: (template: typeof COVER_LETTER_TEMPLATES[0]) => void;
}

export const CoverLetterTemplatesShowcase = ({ onSelectTemplate }: CoverLetterTemplatesShowcaseProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Cover Letter Templates
        </CardTitle>
        <CardDescription>
          Choose a template style that matches your target company and role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COVER_LETTER_TEMPLATES.map((template, idx) => {
            const IconComponent = TONE_ICONS[template.tone as keyof typeof TONE_ICONS] || Mail;
            return (
              <Card key={idx} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  <Badge variant="outline" className="capitalize">{template.tone} tone</Badge>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Structure:</p>
                    <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                      {template.structure.map((section, sIdx) => (
                        <li key={sIdx}>{section}</li>
                      ))}
                    </ol>
                  </div>
                  {onSelectTemplate && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
