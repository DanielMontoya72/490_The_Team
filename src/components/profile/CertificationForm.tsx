import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Award } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const certificationSchema = z.object({
  certification_name: z.string().min(1, "Certification name is required").max(200),
  issuing_organization: z.string().min(1, "Issuing organization is required").max(200),
  date_earned: z.date().optional(),
  expiration_date: z.date().optional().nullable(),
  certification_number: z.string().max(100).optional(),
  document_url: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  does_not_expire: z.boolean().default(false),
});

type CertificationFormData = z.infer<typeof certificationSchema>;

interface CertificationFormProps {
  userId: string;
  certification?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CertificationForm = ({ userId, certification, onSuccess, onCancel }: CertificationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateEarned, setDateEarned] = useState<Date | undefined>(
    certification?.date_earned ? new Date(certification.date_earned) : undefined
  );
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    certification?.expiration_date ? new Date(certification.expiration_date) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CertificationFormData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      certification_name: certification?.certification_name || "",
      issuing_organization: certification?.issuing_organization || "",
      certification_number: certification?.certification_number || "",
      document_url: certification?.document_url || "",
      category: certification?.category || "",
      does_not_expire: certification?.does_not_expire || false,
    },
  });

  const doesNotExpire = watch("does_not_expire");

  const onSubmit = async (data: CertificationFormData) => {
    if (!dateEarned) {
      toast({
        title: "Error",
        description: "Date earned is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const certData = {
        user_id: userId,
        certification_name: data.certification_name,
        issuing_organization: data.issuing_organization,
        date_earned: dateEarned.toISOString().split("T")[0],
        expiration_date: expirationDate && !data.does_not_expire ? expirationDate.toISOString().split("T")[0] : null,
        certification_number: data.certification_number || null,
        document_url: data.document_url || null,
        category: data.category || null,
        does_not_expire: data.does_not_expire,
      };

      if (certification) {
        const { error } = await supabase
          .from("certifications")
          .update(certData)
          .eq("id", certification.id);
        if (error) throw error;
        toast({ title: "Certification updated successfully" });
      } else {
        const { error } = await supabase.from("certifications").insert(certData);
        if (error) throw error;
        toast({ title: "Certification added successfully" });
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
          <Label htmlFor="certification_name">Certification Name *</Label>
          <Input
            id="certification_name"
            {...register("certification_name")}
            placeholder="AWS Certified Solutions Architect"
            className="mt-1.5"
          />
          {errors.certification_name && (
            <p className="text-sm text-destructive mt-1">{errors.certification_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="issuing_organization">Issuing Organization *</Label>
          <Input
            id="issuing_organization"
            {...register("issuing_organization")}
            placeholder="Amazon Web Services"
            className="mt-1.5"
          />
          {errors.issuing_organization && (
            <p className="text-sm text-destructive mt-1">{errors.issuing_organization.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              onValueChange={(value) => setValue("category", value)}
              defaultValue={certification?.category}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technical">Technical</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
                <SelectItem value="Industry-Specific">Industry-Specific</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="certification_number">Certification Number</Label>
            <Input
              id="certification_number"
              {...register("certification_number")}
              placeholder="ABC-123456"
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Date Earned *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !dateEarned && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateEarned ? format(dateEarned, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateEarned}
                  onSelect={(date) => {
                    setDateEarned(date);
                    setValue("date_earned", date as Date);
                  }}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date()}
                />
              </PopoverContent>
            </Popover>
            {!dateEarned && (
              <p className="text-sm text-destructive mt-1">Date earned is required</p>
            )}
          </div>

          <div>
            <Label>Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1.5",
                    !expirationDate && "text-muted-foreground"
                  )}
                  disabled={doesNotExpire}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  initialFocus
                  captionLayout="dropdown"
                  fromDate={new Date(1950, 0, 1)}
                  toDate={new Date(new Date().getFullYear() + 20, 11, 31)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="does_not_expire"
            checked={doesNotExpire}
            onCheckedChange={(checked) => {
              setValue("does_not_expire", checked as boolean);
              if (checked) setExpirationDate(undefined);
            }}
          />
          <Label htmlFor="does_not_expire" className="cursor-pointer">
            This certification does not expire
          </Label>
        </div>

        <div>
          <Label htmlFor="document_url">Document/Verification URL</Label>
          <Input
            id="document_url"
            {...register("document_url")}
            placeholder="https://verify.example.com/cert/123"
            className="mt-1.5"
          />
          {errors.document_url && (
            <p className="text-sm text-destructive mt-1">{errors.document_url.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-start pt-4">
        <Button type="submit" disabled={isSubmitting}>
          <Award className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : certification ? "Update Certification" : "Add Certification"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
