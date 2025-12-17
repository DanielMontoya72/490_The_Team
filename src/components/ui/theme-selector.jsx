import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Monitor, Sun, Moon, Eye, Palette } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "system",
      label: "System",
      description: "Follow system preference",
      icon: Monitor,
    },
    {
      id: "light",
      label: "Light",
      description: "Light theme with white background",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark",
      description: "Dark theme with black background",
      icon: Moon,
    },
    {
      id: "theme-colorful",
      label: "Colorful",
      description: "Fun theme with pink and yellow colors",
      icon: Palette,
    },
    {
      id: "colorblind",
      label: "Colorblind",
      description: "High contrast with orange and blue",
      icon: Eye,
    },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <Monitor className="h-5 w-5" />
          Color Theme
        </CardTitle>
        <CardDescription className="text-base">
          Choose your preferred color theme for the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={theme} onValueChange={setTheme} className="grid gap-4">
          {themes.map((themeOption) => {
            const IconComponent = themeOption.icon;
            return (
              <div key={themeOption.id} className="flex items-center space-x-3">
                <RadioGroupItem value={themeOption.id} id={themeOption.id} />
                <Label
                  htmlFor={themeOption.id}
                  className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors"
                >
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{themeOption.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {themeOption.description}
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        {/* Color palette preview */}
        <div className="mt-6 p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3">Current Theme Colors</h4>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-primary border-2 border-border" title="Primary" />
            <div className="w-8 h-8 rounded-full bg-secondary border-2 border-border" title="Secondary" />
            <div className="w-8 h-8 rounded-full bg-accent border-2 border-border" title="Accent" />
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-border" title="Muted" />
            <div className="w-8 h-8 rounded-full bg-destructive border-2 border-border" title="Destructive" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}