import { RESUME_TEMPLATES } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Layout, Sparkles, GraduationCap, Check } from "lucide-react";

const STYLE_ICONS = {
  classic: FileText,
  modern: Layout,
  creative: Sparkles,
  entry: GraduationCap
};

interface ResumeTemplatesShowcaseProps {
  onSelectTemplate?: (template: typeof RESUME_TEMPLATES[0]) => void;
}

export const ResumeTemplatesShowcase = ({ onSelectTemplate }: ResumeTemplatesShowcaseProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume Templates
        </CardTitle>
        <CardDescription>
          Choose a template structure to guide your resume creation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {RESUME_TEMPLATES.map((template, idx) => {
            const IconComponent = STYLE_ICONS[template.style as keyof typeof STYLE_ICONS] || FileText;
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
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Sections:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.map((section, sIdx) => (
                        <Badge key={sIdx} variant="secondary" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
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
