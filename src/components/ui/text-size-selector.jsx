import { useTextSize } from "@/components/text-size-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Type, Minus, Plus, Maximize } from "lucide-react";

export function TextSizeSelector() {
  const { textSize, setTextSize } = useTextSize();

  const textSizes = [
    {
      id: "small",
      label: "Small",
      description: "Compact text (~15pt base)",
      icon: Minus,
      example: "The quick brown fox",
      exampleClass: "text-sm"
    },
    {
      id: "medium",
      label: "Medium",
      description: "Default comfortable reading size (~18pt base)",
      icon: Type,
      example: "The quick brown fox",
      exampleClass: "text-base"
    },
    {
      id: "large",
      label: "Large",
      description: "Larger text for better readability (~21pt base)",
      icon: Plus,
      example: "The quick brown fox",
      exampleClass: "text-lg"
    }
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <Type className="h-5 w-5" />
          Text Size
        </CardTitle>
        <CardDescription className="text-base">
          Adjust text size across the application for better readability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={textSize} onValueChange={setTextSize} className="grid gap-4">
          {textSizes.map((size) => {
            const IconComponent = size.icon;
            return (
              <div key={size.id} className="flex items-center space-x-3">
                <RadioGroupItem value={size.id} id={size.id} />
                <Label
                  htmlFor={size.id}
                  className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors"
                >
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{size.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {size.description}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    <span className={`${size.exampleClass} font-medium`}>
                      {size.example}
                    </span>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        {/* Current text size preview */}
        <div className="mt-6 p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3">Preview</h4>
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold mb-1">Small Heading</h3>
              <p className="text-sm">This is what small text looks like in the application.</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-1">Medium Heading</h3>
              <p className="text-base">This is what medium text looks like in the application.</p>
            </div>
            <div>
              <h3 className="text-3xl font-semibold mb-1">Large Heading</h3>
              <p className="text-lg">This is what large text looks like in the application.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Text size changes apply immediately across all pages. 
            The new default base text size is ~18pt for better readability. 
            Your preference will be saved automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}