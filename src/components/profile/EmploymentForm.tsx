import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmploymentFormProps {
  initialData?: {
    id?: string;
    jobTitle: string;
    companyName: string;
    location: string;
    startDate: Date | null;
    endDate: Date | null;
    isCurrent: boolean;
    description: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function EmploymentForm({ initialData, onSubmit, onCancel, isSubmitting }: EmploymentFormProps) {
  const [formData, setFormData] = useState({
    jobTitle: initialData?.jobTitle || "",
    companyName: initialData?.companyName || "",
    location: initialData?.location || "",
    startDate: initialData?.startDate || null,
    endDate: initialData?.endDate || null,
    isCurrent: initialData?.isCurrent || false,
    description: initialData?.description || "",
  });
  
  const [charCount, setCharCount] = useState(initialData?.description?.length || 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'description') {
      if (value.length <= 1000) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setCharCount(value.length);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCurrentChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isCurrent: checked,
      endDate: checked ? null : prev.endDate
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.isCurrent && !formData.endDate) {
      newErrors.endDate = "End date is required for past positions";
    }
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jobTitle" className="text-sm font-medium">
            Job Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            placeholder="e.g., Senior Software Engineer"
            className={cn("touch-target", errors.jobTitle && "border-destructive")}
          />
          {errors.jobTitle && (
            <p className="text-xs text-destructive">{errors.jobTitle}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-sm font-medium">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g., Tech Corp"
            className={cn("touch-target", errors.companyName && "border-destructive")}
          />
          {errors.companyName && (
            <p className="text-xs text-destructive">{errors.companyName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium">
          Location
        </Label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g., San Francisco, CA"
          className="touch-target"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal touch-target",
                  !formData.startDate && "text-muted-foreground",
                  errors.startDate && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date || null }))}
                disabled={(date) => date > new Date()}
                initialFocus
                captionLayout="dropdown"
                fromDate={new Date(1950, 0, 1)}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            End Date {!formData.isCurrent && <span className="text-destructive">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={formData.isCurrent}
                className={cn(
                  "w-full justify-start text-left font-normal touch-target",
                  !formData.endDate && "text-muted-foreground",
                  errors.endDate && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.endDate || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date || null }))}
                disabled={(date) => {
                  if (formData.startDate && date < formData.startDate) return true;
                  if (date > new Date()) return true;
                  return false;
                }}
                initialFocus
                captionLayout="dropdown"
                fromDate={new Date(1950, 0, 1)}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isCurrent"
          checked={formData.isCurrent}
          onCheckedChange={handleCurrentChange}
        />
        <Label
          htmlFor="isCurrent"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          I currently work here
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Job Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your responsibilities, achievements, and key projects..."
          rows={6}
          className="resize-none"
        />
        <p className={`text-xs text-right transition-colors ${
          charCount > 900 ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {charCount} / 1000 characters
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="touch-target flex-1 sm:flex-initial"
          size="lg"
        >
          {isSubmitting ? "Saving..." : initialData?.id ? "Update Position" : "Add Position"}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="touch-target flex-1 sm:flex-initial"
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
