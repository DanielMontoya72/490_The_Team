import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Briefcase, Target, TrendingUp, Plus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface SharedMaterialsProps {
  advisors: any[];
}

export function SharedMaterials({ advisors }: SharedMaterialsProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    advisor_id: "",
    material_type: "resume",
    material_id: "",
    material_title: "",
    notes: "",
  });

  useEffect(() => {
    fetchMaterials();
    fetchAvailableMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_shared_materials")
        .select("*, external_advisors(advisor_name)")
        .order("shared_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMaterials = async () => {
    try {
      const [resumesRes, coverLettersRes, jobsRes, goalsRes] = await Promise.all([
        supabase.from("resumes").select("id, resume_name"),
        supabase.from("application_materials").select("id, version_name").eq("material_type", "cover_letter"),
        supabase.from("jobs").select("id, position_title, company"),
        supabase.from("career_goals").select("id, goal_title"),
      ]);

      setResumes(resumesRes.data || []);
      setCoverLetters(coverLettersRes.data || []);
      setJobs(jobsRes.data || []);
      setGoals(goalsRes.data || []);
    } catch (error) {
      console.error("Error fetching available materials:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("advisor_shared_materials").insert({
        user_id: user.id,
        advisor_id: formData.advisor_id,
        material_type: formData.material_type,
        material_id: formData.material_id || null,
        material_title: formData.material_title,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Material shared with advisor");
      setDialogOpen(false);
      fetchMaterials();
      setFormData({
        advisor_id: "",
        material_type: "resume",
        material_id: "",
        material_title: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error("Failed to share material");
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "resume": return <FileText className="h-4 w-4" />;
      case "cover_letter": return <FileText className="h-4 w-4" />;
      case "job": return <Briefcase className="h-4 w-4" />;
      case "goal": return <Target className="h-4 w-4" />;
      case "progress_update": return <TrendingUp className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getMaterialOptions = () => {
    switch (formData.material_type) {
      case "resume":
        return resumes.map(r => ({ id: r.id, title: r.resume_name }));
      case "cover_letter":
        return coverLetters.map(c => ({ id: c.id, title: c.version_name }));
      case "job":
        return jobs.map(j => ({ id: j.id, title: `${j.position_title} at ${j.company}` }));
      case "goal":
        return goals.map(g => ({ id: g.id, title: g.goal_title }));
      default:
        return [];
    }
  };

  const activeAdvisors = advisors.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Shared Materials</h3>
          <p className="text-sm text-muted-foreground">Share job search materials and progress with advisors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={activeAdvisors.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Share Material
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : materials.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No materials shared yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <Card key={material.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getMaterialIcon(material.material_type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{material.material_title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Shared with {material.external_advisors?.advisor_name}
                      </p>
                      {material.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{material.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{material.material_type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(material.shared_at), "MMM d, yyyy")}
                    </span>
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
            <DialogTitle>Share Material</DialogTitle>
            <DialogDescription>Share job search materials with your advisor</DialogDescription>
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

            <div className="space-y-2">
              <Label>Material Type *</Label>
              <Select
                value={formData.material_type}
                onValueChange={(value) => setFormData({ ...formData, material_type: value, material_id: "", material_title: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resume">Resume</SelectItem>
                  <SelectItem value="cover_letter">Cover Letter</SelectItem>
                  <SelectItem value="job">Job Application</SelectItem>
                  <SelectItem value="goal">Career Goal</SelectItem>
                  <SelectItem value="progress_update">Progress Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.material_type !== 'progress_update' && getMaterialOptions().length > 0 && (
              <div className="space-y-2">
                <Label>Select Material</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => {
                    const option = getMaterialOptions().find(o => o.id === value);
                    setFormData({ 
                      ...formData, 
                      material_id: value, 
                      material_title: option?.title || "" 
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getMaterialOptions().map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.material_type === 'progress_update' || getMaterialOptions().length === 0) && (
              <div className="space-y-2">
                <Label>Title *</Label>
                <Textarea
                  value={formData.material_title}
                  onChange={(e) => setFormData({ ...formData, material_title: e.target.value })}
                  placeholder="Describe what you're sharing..."
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any context or questions..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Share</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
