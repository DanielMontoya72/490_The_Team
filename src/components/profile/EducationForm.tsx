import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const educationSchema = z.object({
  institution_name: z.string().min(1, "Institution name is required").max(200),
  degree_type: z.string().min(1, "Degree type is required"),
  field_of_study: z.string().max(200).optional(),
  education_level: z.string().min(1, "Education level is required"),
  start_date: z.date().optional().nullable(),
  graduation_date: z.date().optional().nullable(),
  gpa: z.string().optional(),
  show_gpa: z.boolean().default(true),
  achievements: z.string().max(1000).optional(),
  is_current: z.boolean().default(false),
}).refine((data) => {
  // Field of study is required for non-high school education
  if (data.education_level !== "High School" && !data.field_of_study) {
    return false;
  }
  return true;
}, {
  message: "Field of study is required",
  path: ["field_of_study"],
});

type EducationFormData = z.infer<typeof educationSchema>;

interface EducationFormProps {
  userId: string;
  education?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EducationForm = ({ userId, education, onSuccess, onCancel }: EducationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    education?.start_date ? new Date(education.start_date) : undefined
  );
  const [graduationDate, setGraduationDate] = useState<Date | undefined>(
    education?.graduation_date ? new Date(education.graduation_date) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EducationFormData>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution_name: education?.institution_name || "",
      degree_type: education?.degree_type || "",
      field_of_study: education?.field_of_study || "",
      education_level: education?.education_level || "",
      gpa: education?.gpa?.toString() || "",
      show_gpa: education?.show_gpa ?? true,
      achievements: education?.achievements || "",
      is_current: education?.is_current || false,
    },
  });

  const isCurrent = watch("is_current");
  const showGpa = watch("show_gpa");
  const achievements = watch("achievements") || "";
  const educationLevel = watch("education_level");

  // Define degree types for each education level
  const degreeTypeOptions: Record<string, string[]> = {
    "High School": ["High School Diploma", "GED"],
    "Associate": ["A.A.", "A.S.", "A.A.S."],
    "Bachelor": ["B.A.", "B.S.", "B.B.A.", "B.F.A.", "B.Eng."],
    "Master": ["M.A.", "M.S.", "M.B.A.", "M.Eng.", "M.F.A.", "M.Ed."],
    "Doctorate": ["Ph.D.", "Ed.D.", "M.D.", "J.D.", "D.B.A.", "D.Sc."],
  };

  const onSubmit = async (data: EducationFormData) => {
    setIsSubmitting(true);
    try {
      const educationData = {
        user_id: userId,
        institution_name: data.institution_name,
        degree_type: data.degree_type,
        field_of_study: data.field_of_study,
        education_level: data.education_level,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        graduation_date: graduationDate ? graduationDate.toISOString().split("T")[0] : null,
        gpa: data.gpa ? parseFloat(data.gpa) : null,
        show_gpa: data.show_gpa,
        achievements: data.achievements || null,
        is_current: data.is_current,
      };

      if (education) {
        const { error } = await supabase
          .from("education")
          .update(educationData)
          .eq("id", education.id);
        if (error) throw error;
        toast({ title: "Education updated successfully" });
      } else {
        const { error } = await supabase.from("education").insert(educationData);
        if (error) throw error;
        toast({ title: "Education added successfully" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="institution_name">Institution Name *</Label>
          <Input
            id="institution_name"
            {...register("institution_name")}
            placeholder="University of California"
            className="mt-1.5"
          />
          {errors.institution_name && (
            <p className="text-sm text-destructive mt-1">{errors.institution_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="education_level">Education Level *</Label>
            <Select
              onValueChange={(value) => {
                setValue("education_level", value);
                setValue("degree_type", ""); // Reset degree type when education level changes
              }}
              defaultValue={education?.education_level}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High School">High School</SelectItem>
                <SelectItem value="Associate">Associate</SelectItem>
                <SelectItem value="Bachelor">Bachelor's</SelectItem>
                <SelectItem value="Master">Master's</SelectItem>
                <SelectItem value="Doctorate">Doctorate</SelectItem>
              </SelectContent>
            </Select>
            {errors.education_level && (
              <p className="text-sm text-destructive mt-1">{errors.education_level.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="degree_type">Degree Type *</Label>
            {educationLevel && degreeTypeOptions[educationLevel] ? (
              <Select
                onValueChange={(value) => setValue("degree_type", value)}
                defaultValue={education?.degree_type}
                key={educationLevel} // Force re-render when education level changes
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select degree type" />
                </SelectTrigger>
                <SelectContent>
                  {degreeTypeOptions[educationLevel].map((degreeType) => (
                    <SelectItem key={degreeType} value={degreeType}>
                      {degreeType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="degree_type"
                {...register("degree_type")}
                placeholder="Select education level first"
                className="mt-1.5"
                disabled
              />
            )}
            {errors.degree_type && (
              <p className="text-sm text-destructive mt-1">{errors.degree_type.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="field_of_study">
            Field of Study {educationLevel !== "High School" && "*"}
          </Label>
          <Input
            id="field_of_study"
            {...register("field_of_study")}
            placeholder={educationLevel === "High School" ? "General Studies (Optional)" : "Computer Science"}
            className="mt-1.5"
          />
          {errors.field_of_study && (
            <p className="text-sm text-destructive mt-1">{errors.field_of_study.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>{isCurrent ? "Projected Graduation Date" : "Graduation Date"}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !graduationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {graduationDate ? format(graduationDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={graduationDate}
                  onSelect={setGraduationDate}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              {...register("gpa")}
              placeholder="3.8"
              type="number"
              step="0.01"
              min="0"
              max="4"
              className="mt-1.5"
              disabled={!showGpa}
            />
            {errors.gpa && <p className="text-sm text-destructive mt-1">{errors.gpa.message}</p>}
          </div>

          <div className="flex items-center space-x-2 mt-1.5">
            <Checkbox
              id="is_current"
              checked={isCurrent}
              onCheckedChange={(checked) => {
                setValue("is_current", checked as boolean);
              }}
            />
            <Label htmlFor="is_current" className="cursor-pointer">
              Currently enrolled
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_gpa"
              checked={showGpa}
              onCheckedChange={(checked) => setValue("show_gpa", checked as boolean)}
            />
            <Label htmlFor="show_gpa" className="cursor-pointer">
              Display GPA on profile
            </Label>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="achievements">Achievements & Honors</Label>
            <span className="text-xs text-muted-foreground">{achievements.length}/1000</span>
          </div>
          <Textarea
            id="achievements"
            {...register("achievements")}
            placeholder="Dean's List, Honor Society, Academic Awards..."
            className="mt-1.5 min-h-[100px]"
            maxLength={1000}
          />
          {errors.achievements && (
            <p className="text-sm text-destructive mt-1">{errors.achievements.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-start pt-4">
        <Button type="submit" disabled={isSubmitting}>
          <GraduationCap className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : education ? "Update Education" : "Add Education"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
