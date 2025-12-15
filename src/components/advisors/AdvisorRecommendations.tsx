import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, CheckCircle, Clock, AlertCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdvisorRecommendationsProps {
  advisors: any[];
}

export function AdvisorRecommendations({ advisors }: AdvisorRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    advisor_id: "",
    recommendation_type: "career_path",
    title: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_recommendations")
        .select("*, external_advisors(advisor_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("advisor_recommendations").insert({
        user_id: user.id,
        advisor_id: formData.advisor_id,
        recommendation_type: formData.recommendation_type,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      });

      if (error) throw error;

      toast.success("Recommendation added");
      setDialogOpen(false);
      fetchRecommendations();
      setFormData({
        advisor_id: "",
        recommendation_type: "career_path",
        title: "",
        description: "",
        priority: "medium",
      });
    } catch (error: any) {
      toast.error("Failed to add recommendation");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.implemented_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("advisor_recommendations")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast.success("Status updated");
      fetchRecommendations();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const rateImpact = async (id: string, rating: number) => {
    try {
      const { error } = await supabase
        .from("advisor_recommendations")
        .update({ impact_rating: rating })
        .eq("id", id);

      if (error) throw error;
      toast.success("Impact rating saved");
      fetchRecommendations();
    } catch (error: any) {
      toast.error("Failed to save rating");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      case "low": return "bg-green-500/10 text-green-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeAdvisors = advisors.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Advisor Recommendations</h3>
          <p className="text-sm text-muted-foreground">Track advice and action items from your advisors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Recommendation
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : recommendations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recommendations yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(rec.status)}
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge className={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      <Badge variant="outline">{rec.recommendation_type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <p className="text-xs text-muted-foreground">
                      From {rec.external_advisors?.advisor_name} • {format(new Date(rec.created_at), "MMM d, yyyy")}
                    </p>
                    {rec.status === 'completed' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">Impact:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => rateImpact(rec.id, star)}
                            className="hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                rec.impact_rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {rec.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(rec.id, 'in_progress')}>
                        Start
                      </Button>
                    )}
                    {rec.status === 'in_progress' && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(rec.id, 'completed')}>
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recommendation</DialogTitle>
            <DialogDescription>Record a recommendation from your advisor</DialogDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.recommendation_type}
                  onValueChange={(value) => setFormData({ ...formData, recommendation_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume">Resume</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                    <SelectItem value="career_path">Career Path</SelectItem>
                    <SelectItem value="skill_development">Skill Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
