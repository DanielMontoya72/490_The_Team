import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, MoreVertical, User, Mail, Phone, Linkedin, Building, Calendar, Star, Edit, Trash2, Send, Heart } from "lucide-react";
import { format } from "date-fns";
import { AddAppreciationDialog } from "./AddAppreciationDialog";

interface Reference {
  id: string;
  reference_name: string;
  reference_title: string | null;
  reference_company: string | null;
  reference_email: string | null;
  reference_phone: string | null;
  linkedin_url: string | null;
  relationship_type: string;
  relationship_duration: string | null;
  how_you_know: string | null;
  reference_strength: string;
  availability_status: string;
  last_contacted_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  notes: string | null;
  talking_points: string[];
  skills_they_can_speak_to: string[];
  preferred_contact_method: string;
  is_active: boolean;
  created_at: string;
}

export function ReferenceList() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [appreciationDialogOpen, setAppreciationDialogOpen] = useState(false);
  const [selectedReferenceForAppreciation, setSelectedReferenceForAppreciation] = useState<Reference | null>(null);
  const [formData, setFormData] = useState({
    reference_name: "",
    reference_title: "",
    reference_company: "",
    reference_email: "",
    reference_phone: "",
    linkedin_url: "",
    relationship_type: "professional",
    relationship_duration: "",
    how_you_know: "",
    reference_strength: "strong",
    availability_status: "available",
    notes: "",
    talking_points: "",
    skills_they_can_speak_to: "",
    preferred_contact_method: "email",
  });

  const { data: references, isLoading } = useQuery({
    queryKey: ["professional-references"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("professional_references")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Reference[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const referenceData = {
        user_id: user.id,
        reference_name: data.reference_name,
        reference_title: data.reference_title || null,
        reference_company: data.reference_company || null,
        reference_email: data.reference_email || null,
        reference_phone: data.reference_phone || null,
        linkedin_url: data.linkedin_url || null,
        relationship_type: data.relationship_type,
        relationship_duration: data.relationship_duration || null,
        how_you_know: data.how_you_know || null,
        reference_strength: data.reference_strength,
        availability_status: data.availability_status,
        notes: data.notes || null,
        talking_points: data.talking_points ? data.talking_points.split(",").map(s => s.trim()) : [],
        skills_they_can_speak_to: data.skills_they_can_speak_to ? data.skills_they_can_speak_to.split(",").map(s => s.trim()) : [],
        preferred_contact_method: data.preferred_contact_method,
      };

      if (editingReference) {
        const { error } = await supabase
          .from("professional_references")
          .update(referenceData)
          .eq("id", editingReference.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("professional_references")
          .insert(referenceData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-references"] });
      toast.success(editingReference ? "Reference updated" : "Reference added");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to save reference: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("professional_references")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-references"] });
      toast.success("Reference removed");
    },
    onError: (error) => {
      toast.error("Failed to remove reference: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      reference_name: "",
      reference_title: "",
      reference_company: "",
      reference_email: "",
      reference_phone: "",
      linkedin_url: "",
      relationship_type: "professional",
      relationship_duration: "",
      how_you_know: "",
      reference_strength: "strong",
      availability_status: "available",
      notes: "",
      talking_points: "",
      skills_they_can_speak_to: "",
      preferred_contact_method: "email",
    });
    setEditingReference(null);
  };

  const handleEdit = (reference: Reference) => {
    setEditingReference(reference);
    setFormData({
      reference_name: reference.reference_name,
      reference_title: reference.reference_title || "",
      reference_company: reference.reference_company || "",
      reference_email: reference.reference_email || "",
      reference_phone: reference.reference_phone || "",
      linkedin_url: reference.linkedin_url || "",
      relationship_type: reference.relationship_type,
      relationship_duration: reference.relationship_duration || "",
      how_you_know: reference.how_you_know || "",
      reference_strength: reference.reference_strength,
      availability_status: reference.availability_status,
      notes: reference.notes || "",
      talking_points: (reference.talking_points || []).join(", "),
      skills_they_can_speak_to: (reference.skills_they_can_speak_to || []).join(", "),
      preferred_contact_method: reference.preferred_contact_method,
    });
    setIsDialogOpen(true);
  };

  const getStrengthBadge = (strength: string) => {
    const colors: Record<string, string> = {
      strong: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      developing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return colors[strength] || colors.moderate;
  };

  const getAvailabilityBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      busy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      unavailable: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[status] || colors.available;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading references...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">My References</h2>
          <p className="text-muted-foreground">Manage your professional references</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reference
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReference ? "Edit Reference" : "Add Reference"}</DialogTitle>
              <DialogDescription>
                {editingReference ? "Update reference information" : "Add a new professional reference"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference_name">Name *</Label>
                  <Input
                    id="reference_name"
                    value={formData.reference_name}
                    onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_title">Title</Label>
                  <Input
                    id="reference_title"
                    value={formData.reference_title}
                    onChange={(e) => setFormData({ ...formData, reference_title: e.target.value })}
                    placeholder="Senior Manager"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference_company">Company</Label>
                  <Input
                    id="reference_company"
                    value={formData.reference_company}
                    onChange={(e) => setFormData({ ...formData, reference_company: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_email">Email</Label>
                  <Input
                    id="reference_email"
                    type="email"
                    value={formData.reference_email}
                    onChange={(e) => setFormData({ ...formData, reference_email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference_phone">Phone</Label>
                  <Input
                    id="reference_phone"
                    value={formData.reference_phone}
                    onChange={(e) => setFormData({ ...formData, reference_phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship_type">Relationship Type</Label>
                  <Select value={formData.relationship_type} onValueChange={(value) => setFormData({ ...formData, relationship_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_strength">Strength</Label>
                  <Select value={formData.reference_strength} onValueChange={(value) => setFormData({ ...formData, reference_strength: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strong">Strong</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="developing">Developing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability_status">Availability</Label>
                  <Select value={formData.availability_status} onValueChange={(value) => setFormData({ ...formData, availability_status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship_duration">Relationship Duration</Label>
                  <Input
                    id="relationship_duration"
                    value={formData.relationship_duration}
                    onChange={(e) => setFormData({ ...formData, relationship_duration: e.target.value })}
                    placeholder="3 years"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_contact_method">Preferred Contact</Label>
                  <Select value={formData.preferred_contact_method} onValueChange={(value) => setFormData({ ...formData, preferred_contact_method: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="how_you_know">How You Know Them</Label>
                <Input
                  id="how_you_know"
                  value={formData.how_you_know}
                  onChange={(e) => setFormData({ ...formData, how_you_know: e.target.value })}
                  placeholder="Former manager at ABC Company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills_they_can_speak_to">Skills They Can Speak To (comma-separated)</Label>
                <Input
                  id="skills_they_can_speak_to"
                  value={formData.skills_they_can_speak_to}
                  onChange={(e) => setFormData({ ...formData, skills_they_can_speak_to: e.target.value })}
                  placeholder="Leadership, Project Management, Communication"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="talking_points">Talking Points (comma-separated)</Label>
                <Input
                  id="talking_points"
                  value={formData.talking_points}
                  onChange={(e) => setFormData({ ...formData, talking_points: e.target.value })}
                  placeholder="Led team of 10, Delivered project under budget"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this reference..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.reference_name || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingReference ? "Update" : "Add Reference"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!references?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No References Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add professional references to help with your job applications
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Reference
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {references.map((reference) => (
            <Card key={reference.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{reference.reference_name}</CardTitle>
                    <CardDescription>
                      {reference.reference_title && reference.reference_company
                        ? `${reference.reference_title} at ${reference.reference_company}`
                        : reference.reference_title || reference.reference_company || "No title"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(reference)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedReferenceForAppreciation(reference);
                        setAppreciationDialogOpen(true);
                      }}>
                        <Heart className="h-4 w-4 mr-2" />
                        Send Appreciation
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(reference.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStrengthBadge(reference.reference_strength)}>
                    <Star className="h-3 w-3 mr-1" />
                    {reference.reference_strength}
                  </Badge>
                  <Badge className={getAvailabilityBadge(reference.availability_status)}>
                    {reference.availability_status}
                  </Badge>
                  <Badge variant="outline">{reference.relationship_type}</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {reference.reference_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{reference.reference_email}</span>
                    </div>
                  )}
                  {reference.reference_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{reference.reference_phone}</span>
                    </div>
                  )}
                  {reference.linkedin_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Linkedin className="h-4 w-4" />
                      <a href={reference.linkedin_url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                {reference.skills_they_can_speak_to && (reference.skills_they_can_speak_to as string[]).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Skills they can speak to:</p>
                    <div className="flex flex-wrap gap-1">
                      {(reference.skills_they_can_speak_to as string[]).slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {(reference.skills_they_can_speak_to as string[]).length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{(reference.skills_they_can_speak_to as string[]).length - 3}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                  <span>Used {reference.usage_count} times</span>
                  {reference.last_used_at && (
                    <span>Last used: {format(new Date(reference.last_used_at), "MMM d, yyyy")}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddAppreciationDialog
        open={appreciationDialogOpen}
        onOpenChange={setAppreciationDialogOpen}
        reference={selectedReferenceForAppreciation}
      />
    </div>
  );
}
