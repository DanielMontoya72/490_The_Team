import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, Smile, Frown, Meh, Battery, Zap, TrendingUp, Loader2, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"];
const stressEmojis = ["😌", "🙂", "😐", "😰", "😫"];

export function WellbeingTracker() {
  const queryClient = useQueryClient();
  const [todayEntry, setTodayEntry] = useState({
    mood_score: 3,
    stress_level: 2,
    energy_level: 3,
    motivation_level: 3,
    emotional_support_received: false,
    support_impact_rating: 3,
    notes: "",
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: wellbeingHistory, isLoading } = useQuery({
    queryKey: ['wellbeing-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wellbeing_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .order('tracking_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: todayData } = useQuery({
    queryKey: ['wellbeing-today'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('wellbeing_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .eq('tracking_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (todayData) {
      setTodayEntry({
        mood_score: todayData.mood_score || 3,
        stress_level: todayData.stress_level || 2,
        energy_level: todayData.energy_level || 3,
        motivation_level: todayData.motivation_level || 3,
        emotional_support_received: todayData.emotional_support_received || false,
        support_impact_rating: todayData.support_impact_rating || 3,
        notes: todayData.notes || "",
      });
    }
  }, [todayData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('wellbeing_tracking')
        .upsert({
          user_id: user?.id,
          tracking_date: today,
          ...todayEntry,
        }, { onConflict: 'user_id,tracking_date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellbeing-history'] });
      queryClient.invalidateQueries({ queryKey: ['wellbeing-today'] });
      toast.success("Wellbeing logged for today!");
    },
    onError: () => {
      toast.error("Failed to save wellbeing data");
    },
  });

  const chartData = wellbeingHistory?.slice().reverse().map(entry => ({
    date: format(new Date(entry.tracking_date), 'MMM dd'),
    Mood: entry.mood_score,
    Stress: entry.stress_level,
    Energy: entry.energy_level,
    Motivation: entry.motivation_level,
  })) || [];

  const ScoreSelector = ({ 
    label, 
    value, 
    onChange, 
    emojis,
    icon: Icon,
    description 
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    emojis: string[];
    icon: any;
    description: string;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onChange(score)}
            className={`flex-1 p-3 rounded-lg border text-2xl transition-all ${
              value === score 
                ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            {emojis[score - 1]}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Daily Wellbeing Check-in
          </CardTitle>
          <CardDescription>
            Track your mood and stress levels to understand how support impacts your job search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ScoreSelector
              label="Mood"
              value={todayEntry.mood_score}
              onChange={(v) => setTodayEntry(s => ({ ...s, mood_score: v }))}
              emojis={moodEmojis}
              icon={Smile}
              description="How are you feeling overall today?"
            />
            
            <ScoreSelector
              label="Stress Level"
              value={todayEntry.stress_level}
              onChange={(v) => setTodayEntry(s => ({ ...s, stress_level: v }))}
              emojis={stressEmojis}
              icon={Zap}
              description="How stressed do you feel? (1 = low, 5 = high)"
            />

            <ScoreSelector
              label="Energy Level"
              value={todayEntry.energy_level}
              onChange={(v) => setTodayEntry(s => ({ ...s, energy_level: v }))}
              emojis={["🪫", "🔋", "🔋", "⚡", "💪"]}
              icon={Battery}
              description="How much energy do you have today?"
            />

            <ScoreSelector
              label="Motivation"
              value={todayEntry.motivation_level}
              onChange={(v) => setTodayEntry(s => ({ ...s, motivation_level: v }))}
              emojis={["😴", "🤔", "😐", "💼", "🚀"]}
              icon={TrendingUp}
              description="How motivated are you to job search?"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="support" className="flex flex-col">
                <span>Received Emotional Support Today</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Did family/friends provide encouragement?
                </span>
              </Label>
              <Switch
                id="support"
                checked={todayEntry.emotional_support_received}
                onCheckedChange={(checked) => setTodayEntry(s => ({ ...s, emotional_support_received: checked }))}
              />
            </div>

            {todayEntry.emotional_support_received && (
              <ScoreSelector
                label="Support Impact"
                value={todayEntry.support_impact_rating}
                onChange={(v) => setTodayEntry(s => ({ ...s, support_impact_rating: v }))}
                emojis={["😐", "🙂", "😊", "🥰", "💖"]}
                icon={Heart}
                description="How helpful was the support you received?"
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any thoughts about today..."
                value={todayEntry.notes}
                onChange={(e) => setTodayEntry(s => ({ ...s, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {todayData ? "Update Today's Entry" : "Log Today's Wellbeing"}
          </Button>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Wellbeing Trends
            </CardTitle>
            <CardDescription>
              Track how your wellbeing changes over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Mood" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="Stress" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="Energy" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Motivation" stroke="#a855f7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
