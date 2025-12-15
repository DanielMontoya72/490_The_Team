import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Star, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorEvaluationsProps {
  advisors: any[];
}

export function AdvisorEvaluations({ advisors }: AdvisorEvaluationsProps) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    advisor_id: "",
    overall_rating: 5,
    communication_rating: 5,
    expertise_rating: 5,
    value_rating: 5,
    feedback: "",
    would_recommend: true,
  });

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_evaluations")
        .select("*, external_advisors(advisor_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error: any) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("advisor_evaluations").insert({
        user_id: user.id,
        advisor_id: formData.advisor_id,
        overall_rating: formData.overall_rating,
        communication_rating: formData.communication_rating,
        expertise_rating: formData.expertise_rating,
        value_rating: formData.value_rating,
        feedback: formData.feedback || null,
        would_recommend: formData.would_recommend,
      });

      if (error) throw error;

      toast.success("Evaluation submitted");
      setDialogOpen(false);
      fetchEvaluations();
      setFormData({
        advisor_id: "",
        overall_rating: 5,
        communication_rating: 5,
        expertise_rating: 5,
        value_rating: 5,
        feedback: "",
        would_recommend: true,
      });
    } catch (error: any) {
      toast.error("Failed to submit evaluation");
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            className={`h-6 w-6 ${
              value >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const activeAdvisors = advisors.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Advisor Evaluations</h3>
          <p className="text-sm text-muted-foreground">Rate and review your advisors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={activeAdvisors.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Review
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : evaluations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No evaluations yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {evaluations.map((evaluation) => (
            <Card key={evaluation.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{evaluation.external_advisors?.advisor_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(evaluation.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{evaluation.overall_rating}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Communication</p>
                    <p className="font-medium">{evaluation.communication_rating}/5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expertise</p>
                    <p className="font-medium">{evaluation.expertise_rating}/5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Value</p>
                    <p className="font-medium">{evaluation.value_rating}/5</p>
                  </div>
                </div>

                {evaluation.feedback && (
                  <p className="text-sm text-muted-foreground border-t pt-3">{evaluation.feedback}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evaluate Advisor</DialogTitle>
            <DialogDescription>Share your experience working with this advisor</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Advisor *</Label>
              <Select
                value={formData.advisor_id}
                onValueChange={(value) => setFormData({ ...formData, advisor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  {activeAdvisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.advisor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Overall Rating</Label>
                <StarRating 
                  value={formData.overall_rating} 
                  onChange={(v) => setFormData({ ...formData, overall_rating: v })} 
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>Communication</Label>
                <StarRating 
                  value={formData.communication_rating} 
                  onChange={(v) => setFormData({ ...formData, communication_rating: v })} 
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>Expertise</Label>
                <StarRating 
                  value={formData.expertise_rating} 
                  onChange={(v) => setFormData({ ...formData, expertise_rating: v })} 
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>Value for Money</Label>
                <StarRating 
                  value={formData.value_rating} 
                  onChange={(v) => setFormData({ ...formData, value_rating: v })} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="recommend">Would you recommend this advisor?</Label>
              <Switch
                id="recommend"
                checked={formData.would_recommend}
                onCheckedChange={(checked) => setFormData({ ...formData, would_recommend: checked })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Review</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
