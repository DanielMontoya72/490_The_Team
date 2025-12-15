import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Calendar, Mail, Phone, Linkedin, Coffee, Briefcase, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ContactInteractionHistoryProps {
  contactId: string;
}

export function ContactInteractionHistory({ contactId }: ContactInteractionHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interactionDate, setInteractionDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    interaction_type: "email",
    notes: "",
    outcome: ""
  });

  const { data: interactions, isLoading } = useQuery({
    queryKey: ['contact-interactions', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contact_interactions')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          interaction_type: formData.interaction_type,
          interaction_date: format(interactionDate, "yyyy-MM-dd"),
          notes: formData.notes || null,
          outcome: formData.outcome || null
        });

      if (error) throw error;

      // Update last_contacted_at on the contact
      await supabase
        .from('professional_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', contactId] });
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      toast({
        title: "Interaction Added",
        description: "Contact interaction recorded successfully.",
      });
      setFormData({ interaction_type: "email", notes: "", outcome: "" });
      setInteractionDate(new Date());
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Interaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInteractionIcon = (type: string) => {
    const icons = {
      email: Mail,
      call: Phone,
      meeting: Coffee,
      linkedin: Linkedin,
      other: MessageSquare
    };
    return icons[type as keyof typeof icons] || MessageSquare;
  };

  const getInteractionColor = (type: string) => {
    const colors = {
      email: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      call: 'bg-green-500/10 text-green-500 border-green-500/20',
      meeting: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      linkedin: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Interaction History
            </CardTitle>
            <CardDescription>
              Track all communications and meetings with this contact
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Interaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log New Interaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Interaction Type</Label>
                  <Select value={formData.interaction_type} onValueChange={(value) => setFormData({ ...formData, interaction_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Interaction Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal")}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(interactionDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={interactionDate}
                        onSelect={(date) => date && setInteractionDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="What did you discuss?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Outcome (Optional)</Label>
                  <Input
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    placeholder="Follow-up scheduled, referral received, etc."
                  />
                </div>

                <Button
                  onClick={() => addInteractionMutation.mutate()}
                  disabled={addInteractionMutation.isPending}
                  className="w-full"
                >
                  {addInteractionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Log Interaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : interactions && interactions.length > 0 ? (
          <div className="space-y-4">
            {interactions.map((interaction) => {
              const Icon = getInteractionIcon(interaction.interaction_type);
              return (
                <div key={interaction.id} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className={getInteractionColor(interaction.interaction_type)}>
                      <Icon className="h-3 w-3 mr-1" />
                      {interaction.interaction_type}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {format(new Date(interaction.interaction_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    {interaction.notes && (
                      <p className="text-sm text-muted-foreground">{interaction.notes}</p>
                    )}
                    {interaction.outcome && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Outcome:</span> {interaction.outcome}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No interactions recorded yet</p>
            <p className="text-sm">Start tracking your communications with this contact</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
