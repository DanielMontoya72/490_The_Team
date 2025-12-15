import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Briefcase, Edit, Trash2, Plus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { EmploymentForm } from "./EmploymentForm";

export const EmploymentHistory = ({ userId }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEmploymentHistory();
  }, [userId]);

  const loadEmploymentHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('employment_history')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error loading employment history:", error);
      toast.error("Failed to load employment history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        job_title: formData.jobTitle,
        company_name: formData.companyName,
        location: formData.location || null,
        start_date: formData.startDate ? formData.startDate.toISOString().split('T')[0] : null,
        end_date: formData.isCurrent ? null : (formData.endDate ? formData.endDate.toISOString().split('T')[0] : null),
        is_current: formData.isCurrent,
        job_description: formData.description || null
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('employment_history')
          .update(payload)
          .eq('id', editingEntry.id);

        if (error) throw error;
        toast.success("Employment entry updated!");
      } else {
        const { error } = await supabase
          .from('employment_history')
          .insert([payload]);

        if (error) throw error;
        toast.success("Employment entry added!");
      }

      resetForm();
      loadEmploymentHistory();
    } catch (error) {
      console.error("Error saving employment:", error);
      toast.error("Failed to save employment entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsAdding(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('employment_history')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success("Employment entry deleted");
      loadEmploymentHistory();
    } catch (error) {
      console.error("Error deleting employment:", error);
      toast.error("Failed to delete entry");
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingEntry(null);
  };

  const getInitialFormData = () => {
    if (!editingEntry) return undefined;
    
    return {
      id: editingEntry.id,
      jobTitle: editingEntry.job_title,
      companyName: editingEntry.company_name,
      location: editingEntry.location || "",
      startDate: editingEntry.start_date ? new Date(editingEntry.start_date) : null,
      endDate: editingEntry.end_date ? new Date(editingEntry.end_date) : null,
      isCurrent: editingEntry.is_current,
      description: editingEntry.job_description || ""
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading employment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Employment History
          </h2>
          <p className="text-muted-foreground mt-2 text-base">
            Add your work experience to showcase your career journey
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="touch-target"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Position
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="animate-fade-in border-primary/50">
          <CardHeader className="text-center">
            <CardTitle>{editingEntry ? "Edit Employment Position" : "Add Employment Position"}</CardTitle>
            <CardDescription className="text-base">
              Fill in the details about your work experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmploymentForm
              initialData={getInitialFormData()}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !isAdding ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Employment History Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start building your professional profile by adding your work experience.
              This helps employers understand your career journey.
            </p>
            <Button onClick={() => setIsAdding(true)} size="lg" className="touch-target">
              <Plus className="mr-2 h-5 w-5" />
              Add Your First Position
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <Card 
              key={entry.id} 
              className="hover:shadow-md transition-shadow animate-fade-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="p-3 bg-primary/10 rounded-lg h-fit flex-shrink-0">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl mb-1">{entry.job_title}</h3>
                      <p className="font-semibold text-foreground mb-1">{entry.company_name}</p>
                      {entry.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {entry.location}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          {format(new Date(entry.start_date), 'MMM yyyy')} - {entry.is_current ? 'Present' : format(new Date(entry.end_date), 'MMM yyyy')}
                        </span>
                        {entry.is_current && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </p>
                      {entry.job_description && (
                        <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                          {entry.job_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEdit(entry)}
                      className="touch-target flex-1 md:flex-initial"
                    >
                      <Edit className="h-4 w-4 md:mr-0 mr-2" />
                      <span className="md:hidden">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(entry.id)}
                      className="touch-target flex-1 md:flex-initial text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 md:mr-0 mr-2" />
                      <span className="md:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employment Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this employment entry from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
