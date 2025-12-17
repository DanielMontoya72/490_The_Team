
import { RESUME_TEMPLATES } from "@/data/seedData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Layout, Sparkles, GraduationCap, Check } from "lucide-react";
import SimpleResumeTemplate from "@/components/resume/SimpleResumeTemplate";

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
      <CardContent>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-center items-stretch w-full"
          style={{ width: '100%' }}
        >
          {RESUME_TEMPLATES.map((template, idx) => {
            const IconComponent = STYLE_ICONS[template.style as keyof typeof STYLE_ICONS] || FileText;
            return (
              <Card
                key={idx}
                className="hover:border-primary/50 transition-colors cursor-pointer group flex-1 w-full flex flex-col overflow-hidden"
                style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <CardHeader className="pb-3 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base text-muted-foreground mb-1">
                    {template.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Sections:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.sections.map((section, sIdx) => (
                        <Badge key={sIdx} variant="secondary" className="text-xs px-2 py-1">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div
                    className="border rounded mt-3 overflow-hidden bg-white flex-1 flex items-start justify-center"
                    style={{ aspectRatio: '3/4', minHeight: '420px', maxHeight: '600px', width: '100%', padding: '8px', overflow: 'auto' }}
                  >
                    <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', width: '794px' }}>
                      <SimpleResumeTemplate
                        data={{
                          personalInfo: {
                            name: template.style === 'modern' ? "Alex Kim" : template.style === 'creative' ? "Taylor Lee" : "Jane Doe",
                            email: template.style === 'modern' ? "alex.kim@email.com" : template.style === 'creative' ? "taylor.lee@email.com" : "jane.doe@email.com",
                            phone: template.style === 'modern' ? "555-987-6543" : template.style === 'creative' ? "555-222-3333" : "555-123-4567",
                            location: template.style === 'modern' ? "New York, NY" : template.style === 'creative' ? "Los Angeles, CA" : "San Francisco, CA",
                            headline: template.style === 'modern' ? "Full Stack Developer" : template.style === 'creative' ? "Graphic Designer & Illustrator" : "Product Designer"
                          },
                          summary: template.style === 'modern' ? "Versatile developer with expertise in React, Node.js, and cloud infrastructure." : template.style === 'creative' ? "Imaginative designer with a passion for branding and digital art." : "Creative and detail-oriented designer with 5+ years of experience crafting user-centric digital products.",
                          skills: template.style === 'modern' ? ["React", "Node.js", "AWS"] : template.style === 'creative' ? ["Illustrator", "Photoshop", "Branding"] : ["Figma", "Sketch", "Prototyping"],
                          experience: [{
                            jobTitle: template.style === 'modern' ? "Software Engineer" : template.style === 'creative' ? "Lead Designer" : "UI/UX Designer",
                            company: template.style === 'modern' ? "Tech Solutions" : template.style === 'creative' ? "Creative Studio" : "Acme Corp",
                            dates: template.style === 'modern' ? "6/1/2020 - 1/1/2024" : template.style === 'creative' ? "3/1/2019 - 1/1/2024" : "1/1/2021 - 1/1/2023",
                            description: template.style === 'modern' ? "Built scalable web apps and APIs." : template.style === 'creative' ? "Directed visual identity projects for major brands." : "Led design for mobile and web apps.",
                            location: template.style === 'modern' ? "New York, NY" : template.style === 'creative' ? "Los Angeles, CA" : "Remote"
                          }],
                          education: [{
                            degree: template.style === 'modern' ? "B.S. in Computer Science" : template.style === 'creative' ? "B.F.A. in Illustration" : "B.A. in Graphic Design",
                            institution: template.style === 'modern' ? "NYU" : template.style === 'creative' ? "ArtCenter College of Design" : "State University",
                            year: template.style === 'modern' ? "2020" : template.style === 'creative' ? "2018" : "2020"
                          }],
                          additional: ""
                        }}
                        primaryColor="#2563eb"
                        templateStyle={template.style}
                      />
                    </div>
                  </div>
                  {onSelectTemplate && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3 text-base py-2"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <Check className="h-4 w-4 mr-2" />
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
