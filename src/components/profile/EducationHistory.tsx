import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { EducationForm } from "./EducationForm";
import { GraduationCap, Calendar, Award, Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

interface Education {
  id: string;
  institution_name: string;
  degree_type: string;
  field_of_study: string;
  education_level: string;
  graduation_date: string | null;
  gpa: number | null;
  show_gpa: boolean;
  achievements: string | null;
  is_current: boolean;
}

interface EducationHistoryProps {
  userId: string;
}

export const EducationHistory = ({ userId }: EducationHistoryProps) => {
  const [educations, setEducations] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEducations();
  }, [userId]);

  const fetchEducations = async () => {
    try {
      const { data, error } = await supabase
        .from("education")
        .select("*")
        .eq("user_id", userId)
        .order("graduation_date", { ascending: false, nullsFirst: true });

      if (error) throw error;
      setEducations(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching education",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("education").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Education deleted successfully" });
      fetchEducations();
    } catch (error: any) {
      toast({
        title: "Error deleting education",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = () => {
    setIsAdding(false);
    setEditingEducation(null);
    fetchEducations();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isAdding || editingEducation) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {editingEducation ? "Edit Education" : "Add Education"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EducationForm
            userId={userId}
            education={editingEducation}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAdding(false);
              setEditingEducation(null);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Education History
          </h3>
          <p className="text-muted-foreground text-base">Manage your educational background</p>
        </div>
        <Button onClick={() => setIsAdding(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>

      {educations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No education added yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add your educational background to strengthen your profile
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Education
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {educations.map((edu) => (
            <Card key={edu.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{edu.degree_type} in {edu.field_of_study}</h4>
                        <p className="text-muted-foreground">{edu.institution_name}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 ml-8">
                      <Badge variant="secondary">
                        {edu.education_level}
                      </Badge>
                      {edu.is_current && (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                          Currently Enrolled
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                      {edu.graduation_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {edu.is_current ? "Projected Graduation: " : "Graduated "}{format(new Date(edu.graduation_date), "MMMM yyyy")}
                          </span>
                        </div>
                      )}
                      {edu.show_gpa && edu.gpa && (
                        <div className="flex items-center gap-1.5">
                          <Award className="h-4 w-4" />
                          <span>GPA: {edu.gpa.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {edu.achievements && (
                      <div className="ml-8 mt-3">
                        <p className="text-sm font-medium mb-1">Achievements & Honors:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {edu.achievements}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEducation(edu)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(edu.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Education</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this education entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
