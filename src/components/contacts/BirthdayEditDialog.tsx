import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Cake, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns"; // ✅ parseISO agregado
import { cn } from "@/lib/utils";

interface BirthdayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
}

export function BirthdayEditDialog({ open, onOpenChange, contact }: BirthdayEditDialogProps) {
  const [birthday, setBirthday] = useState<Date | undefined>(
    contact?.birthday ? parseISO(contact.birthday) : undefined, // ✅ antes new Date()
  );

  const queryClient = useQueryClient();

  // Reset birthday state when contact changes or dialog opens
  useEffect(() => {
    if (open && contact) {
      setBirthday(contact.birthday ? parseISO(contact.birthday) : undefined); // ✅ antes new Date()
    }
  }, [open, contact?.id, contact?.birthday]);

  const updateBirthday = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // ✅ Guardar date-only SIN UTC shift
      const birthdayValue = birthday ? format(birthday, "yyyy-MM-dd") : null;

      const { error } = await supabase
        .from("professional_contacts")
        .update({
          birthday: birthdayValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["professional-contacts-maintenance"],
      });
      queryClient.invalidateQueries({ queryKey: ["professional-contacts"] });

      toast.success(birthday ? `Birthday saved for ${contact.first_name}!` : "Birthday removed!");

      onOpenChange(false);
      setBirthday(undefined); // Reset state after successful save
    },
    onError: (error) => {
      console.error("Error updating birthday:", error);
      toast.error("Failed to update birthday");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Edit Birthday for {contact?.first_name}
          </DialogTitle>
          <DialogDescription>Add or update birthday to receive reminders</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Birthday</Label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !birthday && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthday ? format(birthday, "MM-dd-yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthday}
                  onSelect={setBirthday}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <p className="text-xs text-muted-foreground">You'll receive reminders 30 days before their birthday</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              // Reset to original value on cancel
              setBirthday(
                contact?.birthday ? parseISO(contact.birthday) : undefined, // ✅
              );
            }}
          >
            Cancel
          </Button>

          {birthday && (
            <Button
              variant="outline"
              onClick={() => {
                setBirthday(undefined);
                updateBirthday.mutate();
              }}
              disabled={updateBirthday.isPending}
            >
              Remove Birthday
            </Button>
          )}

          <Button onClick={() => updateBirthday.mutate()} disabled={updateBirthday.isPending}>
            {updateBirthday.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Birthday"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
