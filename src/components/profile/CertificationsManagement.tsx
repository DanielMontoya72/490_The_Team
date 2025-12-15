import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { CertificationForm } from "./CertificationForm";
import { Award, Calendar, ExternalLink, Edit, Trash2, Plus, Clock, CheckCircle2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface Certification {
  id: string;
  certification_name: string;
  issuing_organization: string;
  date_earned: string;
  expiration_date: string | null;
  certification_number: string | null;
  document_url: string | null;
  category: string | null;
  verification_status: string;
  does_not_expire: boolean;
}

interface CertificationsManagementProps {
  userId: string;
}

export const CertificationsManagement = ({ userId }: CertificationsManagementProps) => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCertifications();
  }, [userId]);

  const fetchCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", userId)
        .order("date_earned", { ascending: false });

      if (error) throw error;
      setCertifications(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching certifications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Certification deleted successfully" });
      fetchCertifications();
    } catch (error: any) {
      toast({
        title: "Error deleting certification",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = () => {
    setIsAdding(false);
    setEditingCert(null);
    fetchCertifications();
  };

  const isExpired = (cert: Certification) => {
    if (cert.does_not_expire || !cert.expiration_date) return false;
    return isPast(new Date(cert.expiration_date));
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

  if (isAdding || editingCert) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Award className="h-5 w-5" />
            {editingCert ? "Edit Certification" : "Add Certification"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CertificationForm
            userId={userId}
            certification={editingCert}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAdding(false);
              setEditingCert(null);
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
            <Award className="h-6 w-6 text-primary" />
            Certifications
          </h3>
          <p className="text-muted-foreground text-base">Manage your professional certifications</p>
        </div>
        <Button onClick={() => setIsAdding(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>

      {certifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No certifications added yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add your professional certifications to showcase your expertise
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Certification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert) => {
            const expired = isExpired(cert);
            return (
              <Card key={cert.id} className={cn("hover:shadow-md transition-shadow", expired && "opacity-75")}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <Award className={cn("h-5 w-5 mt-1 flex-shrink-0", expired ? "text-muted-foreground" : "text-primary")} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{cert.certification_name}</h4>
                          <p className="text-muted-foreground">{cert.issuing_organization}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 ml-8">
                        {cert.category && (
                          <Badge variant="secondary">
                            {cert.category}
                          </Badge>
                        )}
                        {expired ? (
                          <Badge variant="destructive" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : cert.does_not_expire ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            No Expiration
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Earned {format(new Date(cert.date_earned), "MMMM yyyy")}</span>
                        </div>
                        {cert.expiration_date && !cert.does_not_expire && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>
                              {expired ? "Expired" : "Expires"} {format(new Date(cert.expiration_date), "MMMM yyyy")}
                            </span>
                          </div>
                        )}
                      </div>

                      {cert.certification_number && (
                        <div className="ml-8 text-sm">
                          <span className="font-medium">ID: </span>
                          <span className="text-muted-foreground">{cert.certification_number}</span>
                        </div>
                      )}

                      {cert.document_url && (
                        <div className="ml-8">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => window.open(cert.document_url!, "_blank")}
                          >
                            View Verification
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCert(cert)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(cert.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this certification? This action cannot be undone.
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
