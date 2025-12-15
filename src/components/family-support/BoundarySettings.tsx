import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Clock, MessageSquare, X, Plus, Loader2 } from "lucide-react";

export function BoundarySettings() {
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState("");
  const [settings, setSettings] = useState({
    preferred_contact_frequency: 'weekly',
    quiet_hours_start: '',
    quiet_hours_end: '',
    topics_off_limits: [] as string[],
    preferred_support_types: ['emotional', 'practical'] as string[],
    allow_unsolicited_advice: true,
    communication_preferences: { text: true, call: false, in_person: true },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['support-boundaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_boundaries')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        preferred_contact_frequency: existingSettings.preferred_contact_frequency || 'weekly',
        quiet_hours_start: existingSettings.quiet_hours_start || '',
        quiet_hours_end: existingSettings.quiet_hours_end || '',
        topics_off_limits: existingSettings.topics_off_limits || [],
        preferred_support_types: existingSettings.preferred_support_types || ['emotional', 'practical'],
        allow_unsolicited_advice: existingSettings.allow_unsolicited_advice ?? true,
        communication_preferences: (existingSettings.communication_preferences as any) || { text: true, call: false, in_person: true },
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('support_boundaries')
        .upsert({
          user_id: user?.id,
          ...settings,
          quiet_hours_start: settings.quiet_hours_start || null,
          quiet_hours_end: settings.quiet_hours_end || null,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-boundaries'] });
      toast.success("Boundary settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const addOffLimitTopic = () => {
    if (newTopic && !settings.topics_off_limits.includes(newTopic)) {
      setSettings(s => ({
        ...s,
        topics_off_limits: [...s.topics_off_limits, newTopic],
      }));
      setNewTopic("");
    }
  };

  const removeOffLimitTopic = (topic: string) => {
    setSettings(s => ({
      ...s,
      topics_off_limits: s.topics_off_limits.filter(t => t !== topic),
    }));
  };

  const toggleSupportType = (type: string) => {
    setSettings(s => ({
      ...s,
      preferred_support_types: s.preferred_support_types.includes(type)
        ? s.preferred_support_types.filter(t => t !== type)
        : [...s.preferred_support_types, type],
    }));
  };

  const toggleCommunicationPref = (type: string) => {
    setSettings(s => ({
      ...s,
      communication_preferences: {
        ...s.communication_preferences,
        [type]: !s.communication_preferences[type as keyof typeof s.communication_preferences],
      },
    }));
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Support Boundaries
          </CardTitle>
          <CardDescription>
            Set healthy boundaries for how your supporters can best help you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Preferred Check-in Frequency
            </Label>
            <Select
              value={settings.preferred_contact_frequency}
              onValueChange={(v) => setSettings(s => ({ ...s, preferred_contact_frequency: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Check-ins</SelectItem>
                <SelectItem value="weekly">Weekly Check-ins</SelectItem>
                <SelectItem value="milestone_only">Milestone Updates Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often would you like supporters to check in with you?
            </p>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-2">
            <Label>Quiet Hours (optional)</Label>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  type="time"
                  value={settings.quiet_hours_start}
                  onChange={(e) => setSettings(s => ({ ...s, quiet_hours_start: e.target.value }))}
                  placeholder="Start"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex-1">
                <Input
                  type="time"
                  value={settings.quiet_hours_end}
                  onChange={(e) => setSettings(s => ({ ...s, quiet_hours_end: e.target.value }))}
                  placeholder="End"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Set times when you prefer not to discuss job search
            </p>
          </div>

          {/* Unsolicited Advice */}
          <div className="flex items-center justify-between">
            <Label htmlFor="advice" className="flex flex-col">
              <span>Allow Unsolicited Advice</span>
              <span className="text-xs text-muted-foreground font-normal">
                Supporters can offer suggestions without being asked
              </span>
            </Label>
            <Switch
              id="advice"
              checked={settings.allow_unsolicited_advice}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, allow_unsolicited_advice: checked }))}
            />
          </div>

          {/* Preferred Support Types */}
          <div className="space-y-2">
            <Label>Preferred Types of Support</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'emotional', label: '💙 Emotional', desc: 'Listening, encouragement' },
                { id: 'practical', label: '🔧 Practical', desc: 'Resume help, referrals' },
                { id: 'financial', label: '💰 Financial', desc: 'Financial assistance' },
                { id: 'space', label: '🧘 Space', desc: 'Understanding when you need alone time' },
              ].map((type) => (
                <Badge
                  key={type.id}
                  variant={settings.preferred_support_types.includes(type.id) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleSupportType(type.id)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to select the types of support you'd appreciate
            </p>
          </div>

          {/* Communication Preferences */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communication Preferences
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'text', label: '💬 Text/Chat' },
                { id: 'call', label: '📞 Phone Calls' },
                { id: 'in_person', label: '👥 In Person' },
              ].map((pref) => (
                <Badge
                  key={pref.id}
                  variant={settings.communication_preferences[pref.id as keyof typeof settings.communication_preferences] ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleCommunicationPref(pref.id)}
                >
                  {pref.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Topics Off-Limits */}
          <div className="space-y-2">
            <Label>Topics Off-Limits</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., salary discussions, specific companies"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOffLimitTopic()}
              />
              <Button onClick={addOffLimitTopic} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {settings.topics_off_limits.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.topics_off_limits.map((topic) => (
                  <Badge key={topic} variant="secondary" className="pr-1">
                    {topic}
                    <button
                      onClick={() => removeOffLimitTopic(topic)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Topics you'd rather not discuss with supporters
            </p>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Boundary Settings
          </Button>
        </CardContent>
      </Card>

      {/* Guidance Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">💡 Tips for Healthy Support Dynamics</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Be specific</strong> about what helps - "I need encouragement" vs "I need help reviewing my resume"</li>
            <li>• <strong>It's okay to change</strong> your boundaries as your needs evolve</li>
            <li>• <strong>Communicate directly</strong> - your supporters want to help but may not know how</li>
            <li>• <strong>Take breaks</strong> from job search discussions when you need to recharge</li>
            <li>• <strong>Appreciate intentions</strong> even when advice isn't helpful - redirect gently</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
