import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Play, Square } from "lucide-react";

export function TimeTrackingWidget() {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [activityType, setActivityType] = useState<string>("");
  const [activityTitle, setActivityTitle] = useState("");
  const [energyLevel, setEnergyLevel] = useState([3]);
  const [productivityRating, setProductivityRating] = useState([3]);
  const [notes, setNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const queryClient = useQueryClient();

  // Live timer update
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase
        .from('time_tracking_entries')
        .insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['productivity-metrics'] });
      toast.success("Time entry saved successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to save time entry");
      console.error(error);
    },
  });

  const startTracking = () => {
    if (!activityType || !activityTitle) {
      toast.error("Please select activity type and enter a title");
      return;
    }
    setStartTime(new Date());
    setIsTracking(true);
    toast.success("Time tracking started");
  };

  const stopTracking = () => {
    if (!startTime) return;

    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    saveMutation.mutate({
      user_id: user?.id,
      activity_type: activityType,
      activity_title: activityTitle,
      duration_minutes: durationMinutes,
      energy_level: energyLevel[0],
      productivity_rating: productivityRating[0],
      notes: notes || null,
      started_at: startTime.toISOString(),
      ended_at: endTime.toISOString(),
    });

    setIsTracking(false);
  };

  const resetForm = () => {
    setActivityType("");
    setActivityTitle("");
    setEnergyLevel([3]);
    setProductivityRating([3]);
    setNotes("");
    setStartTime(null);
    setElapsedSeconds(0);
  };

  const activityTypes = [
    { value: "job_research", label: "Job Research" },
    { value: "application", label: "Application" },
    { value: "networking", label: "Networking" },
    { value: "interview_prep", label: "Interview Prep" },
    { value: "skill_development", label: "Skill Development" },
    { value: "resume_work", label: "Resume Work" },
    { value: "cover_letter", label: "Cover Letter" },
    { value: "follow_up", label: "Follow-up" },
  ];

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-lg shadow-purple-100 dark:shadow-purple-900/20">
      <CardHeader>
        <CardTitle className="text-purple-700 dark:text-purple-300">Track Your Time</CardTitle>
        <CardDescription className="text-purple-600 dark:text-purple-400">
          Log activities to analyze your productivity patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Activity Type *</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Activity Title *</Label>
            <Input
              placeholder="e.g., Applied to Software Engineer role"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Energy Level: {energyLevel[0]}/5</Label>
            <Slider
              value={energyLevel}
              onValueChange={setEnergyLevel}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              1 = Very Low, 5 = Very High
            </p>
          </div>

          <div className="space-y-2">
            <Label>Productivity Rating: {productivityRating[0]}/5</Label>
            <Slider
              value={productivityRating}
              onValueChange={setProductivityRating}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              1 = Not Productive, 5 = Very Productive
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Add any relevant notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-purple-200 dark:border-purple-800">
          {!isTracking ? (
            <Button onClick={startTracking} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Play className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          ) : (
            <Button onClick={stopTracking} variant="destructive" className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
              <Square className="w-4 h-4 mr-2" />
              Stop Timer ({Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
