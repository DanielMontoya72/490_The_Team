import { useState } from "react";
import { RESUME_TEMPLATES } from "@/data/seedData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface BasicTemplatePickerProps {
  selected: string;
  onSelect: (style: string) => void;
}

export function BasicTemplatePicker({ selected, onSelect }: BasicTemplatePickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Template</CardTitle>
        <CardDescription>Choose a basic layout for your resume. You can change the color below.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {RESUME_TEMPLATES.map((template, idx) => (
            <Button
              key={template.style}
              variant={selected === template.style ? "default" : "outline"}
              className="flex flex-col items-start h-auto min-w-0 w-full p-4 gap-2 border whitespace-normal break-words"
              style={{ wordBreak: 'break-word', textAlign: 'left' }}
              onClick={() => onSelect(template.style)}
            >
              <span className="font-semibold text-base flex items-center gap-2 w-full whitespace-normal break-words" style={{ wordBreak: 'break-word' }}>
                {template.name}
                {selected === template.style && <Check className="h-4 w-4 text-green-600" />}
              </span>
              <span className="text-xs text-muted-foreground w-full whitespace-normal break-words" style={{ wordBreak: 'break-word' }}>
                {template.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
