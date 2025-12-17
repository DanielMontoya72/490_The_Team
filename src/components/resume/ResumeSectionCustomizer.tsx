import { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GripVertical, Check, AlertCircle, Save, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ResumeSection {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  formatting?: {
    fontSize?: "small" | "medium" | "large";
    spacing?: "compact" | "normal" | "relaxed";
  };
  isComplete?: boolean;
  requiredForJobTypes?: string[];
}

interface ResumeSectionCustomizerProps {
  sections: ResumeSection[];
  onSectionsChange: (sections: ResumeSection[]) => void;
  jobType?: string;
  userId: string;
}

interface CustomPreset {
  id: string;
  preset_name: string;
  sections: ResumeSection[];
}

const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: "summary", name: "Professional Summary", enabled: true, order: 0, isComplete: true },
  { id: "experience", name: "Work Experience", enabled: true, order: 1, isComplete: true, requiredForJobTypes: ["all"] },
  { id: "education", name: "Education", enabled: true, order: 2, isComplete: true, requiredForJobTypes: ["all"] },
  { id: "skills", name: "Skills", enabled: true, order: 3, isComplete: true, requiredForJobTypes: ["technical", "creative"] },
  { id: "projects", name: "Projects", enabled: true, order: 4, isComplete: false, requiredForJobTypes: ["technical"] },
  { id: "certifications", name: "Certifications", enabled: true, order: 5, isComplete: false, requiredForJobTypes: ["technical", "professional"] },
];

const SECTION_PRESETS = {
  standard: {
    name: "Standard Professional",
    sections: ["summary", "experience", "education", "skills"],
  },
  technical: {
    name: "Technical/Developer",
    sections: ["summary", "skills", "experience", "projects", "education", "certifications"],
  },
  executive: {
    name: "Executive/Leadership",
    sections: ["summary", "experience", "education", "certifications"],
  },
  entrylevel: {
    name: "Entry Level",
    sections: ["summary", "education", "skills", "projects"],
  },
};

function SortableSection({ section, onToggle, onFormatChange }: { 
  section: ResumeSection; 
  onToggle: (id: string) => void;
  onFormatChange: (id: string, formatting: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: section.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border rounded-lg p-4 bg-card cursor-grab active:cursor-grabbing ${isDragging ? "shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-shrink-0">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-sm break-words">{section.name}</h4>
            {section.isComplete ? (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                <Check className="h-3 w-3 mr-1" /> Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" /> Incomplete
              </Badge>
            )}
          </div>
          
          {section.requiredForJobTypes && section.requiredForJobTypes.length > 0 && (
            <p className="text-xs text-muted-foreground break-words">
              Recommended for: {section.requiredForJobTypes.join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1">
            <Select
              disabled={!section.enabled}
              value={section.formatting?.fontSize || "medium"}
              onValueChange={(value) => onFormatChange(section.id, { ...section.formatting, fontSize: value })}
            >
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Select
              disabled={!section.enabled}
              value={section.formatting?.spacing || "normal"}
              onValueChange={(value) => onFormatChange(section.id, { ...section.formatting, spacing: value })}
            >
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue placeholder="Spacing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Switch
            checked={section.enabled}
            onCheckedChange={() => onToggle(section.id)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}

export const ResumeSectionCustomizer = ({ 
  sections: initialSections, 
  onSectionsChange,
  jobType,
  userId
}: ResumeSectionCustomizerProps) => {
  const [sections, setSections] = useState<ResumeSection[]>(
    initialSections.length > 0 ? initialSections : DEFAULT_SECTIONS
  );
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCustomPresets();
  }, [userId]);

  const fetchCustomPresets = async () => {
    try {
      const { data, error } = await supabase
        .from("resume_section_presets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setCustomPresets(data?.map(preset => ({
        id: preset.id,
        preset_name: preset.preset_name,
        sections: preset.sections as unknown as ResumeSection[]
      })) || []);
    } catch (error: any) {
      console.error("Failed to fetch custom presets:", error);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    setSavingPreset(true);
    try {
      const { error } = await supabase
        .from("resume_section_presets")
        .insert([{
          user_id: userId,
          preset_name: newPresetName.trim(),
          sections: sections as any
        }]);

      if (error) throw error;

      toast.success(`Saved preset: ${newPresetName}`);
      setNewPresetName("");
      setSaveDialogOpen(false);
      fetchCustomPresets();
    } catch (error: any) {
      toast.error("Failed to save preset");
      console.error(error);
    } finally {
      setSavingPreset(false);
    }
  };

  const handleLoadCustomPreset = (preset: CustomPreset) => {
    const newSections = preset.sections.map((section, index) => ({
      ...section,
      order: index
    }));
    setSections(newSections);
    onSectionsChange(newSections);
    toast.success(`Loaded preset: ${preset.preset_name}`);
  };

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    try {
      const { error } = await supabase
        .from("resume_section_presets")
        .delete()
        .eq("id", presetId);

      if (error) throw error;

      toast.success(`Deleted preset: ${presetName}`);
      fetchCustomPresets();
    } catch (error: any) {
      toast.error("Failed to delete preset");
      console.error(error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
        
        onSectionsChange(newItems);
        return newItems;
      });
    }
  };

  const handleToggle = (id: string) => {
    const newSections = sections.map((section) =>
      section.id === id ? { ...section, enabled: !section.enabled } : section
    );
    setSections(newSections);
    onSectionsChange(newSections);
  };

  const handleFormatChange = (id: string, formatting: any) => {
    const newSections = sections.map((section) =>
      section.id === id ? { ...section, formatting } : section
    );
    setSections(newSections);
    onSectionsChange(newSections);
  };

  const applyPreset = (presetKey: string) => {
    const preset = SECTION_PRESETS[presetKey as keyof typeof SECTION_PRESETS];
    const newSections = sections.map((section) => ({
      ...section,
      enabled: preset.sections.includes(section.id),
      order: preset.sections.indexOf(section.id) !== -1 
        ? preset.sections.indexOf(section.id) 
        : section.order,
    })).sort((a, b) => a.order - b.order);
    
    setSections(newSections);
    onSectionsChange(newSections);
    toast.success(`Applied ${preset.name} preset`);
  };

  const enabledCount = sections.filter((s) => s.enabled).length;
  const completedCount = sections.filter((s) => s.enabled && s.isComplete).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Section Customization</CardTitle>
          <CardDescription>
            Drag to reorder, toggle to show/hide sections. {enabledCount} sections enabled, {completedCount} complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quick Presets</label>
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Current as Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Section Preset</DialogTitle>
                    <DialogDescription>
                      Save your current section arrangement to reuse later
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="presetName">Preset Name</Label>
                      <Input
                        id="presetName"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="e.g., Technical Resume Layout"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePreset();
                          }
                        }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {enabledCount} sections enabled • {completedCount} complete
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSaveDialogOpen(false)}
                      disabled={savingPreset}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSavePreset} disabled={savingPreset}>
                      {savingPreset ? "Saving..." : "Save Preset"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Built-in Templates</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SECTION_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {customPresets.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Your Custom Presets
                </div>
                <div className="flex flex-wrap gap-2">
                  {customPresets.map((preset) => (
                    <div key={preset.id} className="flex items-center gap-1 border rounded-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-r-none border-r"
                        onClick={() => handleLoadCustomPreset(preset)}
                      >
                        {preset.preset_name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 rounded-l-none"
                        onClick={() => handleDeletePreset(preset.id, preset.preset_name)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {jobType && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                💡 <strong>Tip:</strong> For {jobType} positions, consider enabling sections marked as recommended.
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onToggle={handleToggle}
                    onFormatChange={handleFormatChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};
