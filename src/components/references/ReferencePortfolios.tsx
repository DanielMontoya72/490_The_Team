import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, FolderOpen, Star, Edit, Trash2, Users } from "lucide-react";

interface Reference {
  id: string;
  reference_name: string;
  reference_title: string | null;
  reference_company: string | null;
  reference_strength: string;
}

interface Portfolio {
  id: string;
  portfolio_name: string;
  career_goal: string | null;
  description: string | null;
  reference_ids: string[];
  is_default: boolean;
  created_at: string;
}

export function ReferencePortfolios() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [formData, setFormData] = useState({
    portfolio_name: "",
    career_goal: "",
    description: "",
    reference_ids: [] as string[],
    is_default: false,
  });

  const { data: references } = useQuery({
    queryKey: ["professional-references-for-portfolio"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("professional_references")
        .select("id, reference_name, reference_title, reference_company, reference_strength")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data as Reference[];
    },
  });

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ["reference-portfolios"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reference_portfolios")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Portfolio[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from("reference_portfolios")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const portfolioData = {
        user_id: user.id,
        portfolio_name: data.portfolio_name,
        career_goal: data.career_goal || null,
        description: data.description || null,
        reference_ids: data.reference_ids,
        is_default: data.is_default,
      };

      if (editingPortfolio) {
        const { error } = await supabase
          .from("reference_portfolios")
          .update(portfolioData)
          .eq("id", editingPortfolio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reference_portfolios")
          .insert(portfolioData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-portfolios"] });
      toast.success(editingPortfolio ? "Portfolio updated" : "Portfolio created");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to save portfolio: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reference_portfolios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-portfolios"] });
      toast.success("Portfolio deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete portfolio: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      portfolio_name: "",
      career_goal: "",
      description: "",
      reference_ids: [],
      is_default: false,
    });
    setEditingPortfolio(null);
  };

  const handleEdit = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setFormData({
      portfolio_name: portfolio.portfolio_name,
      career_goal: portfolio.career_goal || "",
      description: portfolio.description || "",
      reference_ids: portfolio.reference_ids || [],
      is_default: portfolio.is_default,
    });
    setIsDialogOpen(true);
  };

  const toggleReference = (refId: string) => {
    setFormData((prev) => ({
      ...prev,
      reference_ids: prev.reference_ids.includes(refId)
        ? prev.reference_ids.filter((id) => id !== refId)
        : [...prev.reference_ids, refId],
    }));
  };

  const getReferencesForPortfolio = (referenceIds: string[]) => {
    return references?.filter((ref) => referenceIds.includes(ref.id)) || [];
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading portfolios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Reference Portfolios</h2>
          <p className="text-muted-foreground">Create reference sets for different career goals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPortfolio ? "Edit Portfolio" : "Create Portfolio"}</DialogTitle>
              <DialogDescription>
                Group references together for specific career goals or job types
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio_name">Portfolio Name *</Label>
                <Input
                  id="portfolio_name"
                  value={formData.portfolio_name}
                  onChange={(e) => setFormData({ ...formData, portfolio_name: e.target.value })}
                  placeholder="e.g., Tech Leadership References"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="career_goal">Career Goal</Label>
                <Input
                  id="career_goal"
                  value={formData.career_goal}
                  onChange={(e) => setFormData({ ...formData, career_goal: e.target.value })}
                  placeholder="e.g., Senior Engineering Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when to use this portfolio..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Select References</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
                  {references?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No references available. Add references first.</p>
                  ) : (
                    references?.map((ref) => (
                      <div key={ref.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={ref.id}
                          checked={formData.reference_ids.includes(ref.id)}
                          onCheckedChange={() => toggleReference(ref.id)}
                        />
                        <label htmlFor={ref.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{ref.reference_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {ref.reference_title && ref.reference_company
                              ? `${ref.reference_title} at ${ref.reference_company}`
                              : ref.reference_title || ref.reference_company || "No title"}
                          </div>
                        </label>
                        <Badge variant="outline" className="capitalize">{ref.reference_strength}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.reference_ids.length} reference(s) selected
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: !!checked })}
                />
                <label htmlFor="is_default" className="text-sm cursor-pointer">
                  Set as default portfolio
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.portfolio_name || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingPortfolio ? "Update" : "Create Portfolio"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!portfolios?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Portfolios Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create portfolios to group references for different career goals
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => {
            const portfolioRefs = getReferencesForPortfolio(portfolio.reference_ids || []);
            return (
              <Card key={portfolio.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{portfolio.portfolio_name}</CardTitle>
                        {portfolio.is_default && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {portfolio.career_goal && (
                        <CardDescription>{portfolio.career_goal}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {portfolio.description && (
                    <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                  )}

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Users className="h-4 w-4" />
                      {portfolioRefs.length} Reference(s)
                    </div>
                    <div className="space-y-2">
                      {portfolioRefs.slice(0, 3).map((ref) => (
                        <div key={ref.id} className="text-sm p-2 bg-muted rounded">
                          <div className="font-medium">{ref.reference_name}</div>
                          <div className="text-muted-foreground text-xs">
                            {ref.reference_title || ref.reference_company || "No title"}
                          </div>
                        </div>
                      ))}
                      {portfolioRefs.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{portfolioRefs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(portfolio)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(portfolio.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
