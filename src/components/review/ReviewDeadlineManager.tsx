import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";

interface ReviewDeadlineManagerProps {
  shareId: string;
  materialType: "resume" | "cover_letter";
  currentDeadline?: string | null;
  onDeadlineChange?: () => void;
}

export function ReviewDeadlineManager({
  shareId,
  materialType,
  currentDeadline,
  onDeadlineChange,
}: ReviewDeadlineManagerProps) {
  const [deadline, setDeadline] = useState<Date | undefined>(
    currentDeadline ? new Date(currentDeadline) : undefined
  );
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();

  const tableName = materialType === "resume" ? "resume_shares" : "cover_letter_shares";

  const updateDeadline = async (newDeadline: Date | undefined) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .update({
          review_deadline: newDeadline?.toISOString() || null,
        })
        .eq("id", shareId);

      if (error) throw error;

      setDeadline(newDeadline);
      setCalendarOpen(false);
      
      toast({
        title: newDeadline ? "Deadline set" : "Deadline removed",
        description: newDeadline 
          ? `Review deadline set to ${format(newDeadline, "PPP")}`
          : "Review deadline has been removed",
      });

      onDeadlineChange?.();
    } catch (error: any) {
      toast({
        title: "Error updating deadline",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineStatus = () => {
    if (!deadline) return null;

    const daysRemaining = differenceInDays(deadline, new Date());
    
    if (isPast(deadline) && !isToday(deadline)) {
      return {
        type: "overdue",
        label: "Overdue",
        color: "bg-red-500",
        icon: AlertTriangle,
        message: `Deadline passed ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`,
      };
    }

    if (isToday(deadline)) {
      return {
        type: "today",
        label: "Due Today",
        color: "bg-orange-500",
        icon: Clock,
        message: "Review deadline is today!",
      };
    }

    if (daysRemaining <= 3) {
      return {
        type: "urgent",
        label: "Urgent",
        color: "bg-yellow-500",
        icon: Bell,
        message: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
      };
    }

    return {
      type: "on-track",
      label: "On Track",
      color: "bg-green-500",
      icon: CheckCircle2,
      message: `${daysRemaining} days remaining`,
    };
  };

  const status = getDeadlineStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Review Deadline
        </CardTitle>
        <CardDescription>
          Set a deadline for reviewers to complete their feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Deadline Display */}
        {deadline && status && (
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            status.type === "overdue" ? "bg-red-50 border border-red-200" :
            status.type === "today" ? "bg-orange-50 border border-orange-200" :
            status.type === "urgent" ? "bg-yellow-50 border border-yellow-200" :
            "bg-green-50 border border-green-200"
          }`}>
            <div className={`p-2 rounded-full ${status.color}`}>
              <status.icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{format(deadline, "PPP")}</span>
                <Badge variant={status.type === "overdue" ? "destructive" : "secondary"}>
                  {status.label}
                </Badge>
              </div>
              <p className={`text-sm ${
                status.type === "overdue" ? "text-red-600" :
                status.type === "today" ? "text-orange-600" :
                status.type === "urgent" ? "text-yellow-700" :
                "text-green-600"
              }`}>
                {status.message}
              </p>
            </div>
          </div>
        )}

        {/* Deadline Picker */}
        <div className="space-y-2">
          <Label>Set or Update Deadline</Label>
          <div className="flex gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-start text-left font-normal"
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Select deadline date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={(date) => {
                    if (date) {
                      updateDeadline(date);
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {deadline && (
              <Button 
                variant="outline" 
                onClick={() => updateDeadline(undefined)}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Quick Select Options */}
        <div className="space-y-2">
          <Label>Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "3 days", days: 3 },
              { label: "1 week", days: 7 },
              { label: "2 weeks", days: 14 },
              { label: "1 month", days: 30 },
            ].map(option => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDeadline = new Date();
                  newDeadline.setDate(newDeadline.getDate() + option.days);
                  updateDeadline(newDeadline);
                }}
                disabled={loading}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Reminder Note */}
        {!deadline && (
          <p className="text-sm text-muted-foreground">
            Setting a deadline helps reviewers prioritize their feedback and ensures 
            timely completion of the review process.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
