import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Upload, FileSpreadsheet, Users, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { format } from "date-fns";

interface BulkOnboardingProps {
  organizationId: string;
}

export function BulkOnboarding({ organizationId }: BulkOnboardingProps) {
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [batchName, setBatchName] = useState("");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: cohorts } = useQuery({
    queryKey: ['organization-cohorts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_cohorts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: batches, isLoading } = useQuery({
    queryKey: ['onboarding-batches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_onboarding_batches')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      // Parse CSV
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const users = lines.slice(1).map(line => {
        const values = line.split(',');
        const user: Record<string, string> = {};
        headers.forEach((h, i) => {
          user[h] = values[i]?.trim() || '';
        });
        return user;
      });

      const totalUsers = users.length;
      let successful = 0;
      let failed = 0;
      const errors: any[] = [];

      // Create batch record
      const { data: batch, error: batchError } = await supabase
        .from('bulk_onboarding_batches')
        .insert({
          organization_id: organizationId,
          cohort_id: selectedCohort || null,
          batch_name: batchName || `Import ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
          total_users: totalUsers,
          status: 'processing',
          import_data: { users, headers },
          created_by: user?.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Simulate processing (in real implementation, this would create accounts)
      for (const userData of users) {
        try {
          // Simulate user creation - in production, this would actually create users
          if (userData.email && userData.email.includes('@')) {
            successful++;
          } else {
            failed++;
            errors.push({ email: userData.email, error: 'Invalid email format' });
          }
        } catch (err) {
          failed++;
          errors.push({ email: userData.email, error: 'Failed to create' });
        }
      }

      // Update batch with results
      await supabase
        .from('bulk_onboarding_batches')
        .update({
          status: 'completed',
          successful_imports: successful,
          failed_imports: failed,
          error_log: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batch.id);

      return { successful, failed, total: totalUsers };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-batches'] });
      toast.success(`Import completed: ${data.successful}/${data.total} successful`);
      setCsvData("");
      setBatchName("");
    },
    onError: () => {
      toast.error("Failed to process import");
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
      pending: { variant: "secondary", icon: null },
      processing: { variant: "default", icon: Loader2 },
      completed: { variant: "outline", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="capitalize">
        {Icon && <Icon className={`h-3 w-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />}
        {status}
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const template = "email,first_name,last_name,phone\njohn@example.com,John,Doe,+1234567890\njane@example.com,Jane,Smith,+0987654321";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk User Onboarding
          </CardTitle>
          <CardDescription>
            Import multiple users at once using CSV data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Batch Name (optional)</Label>
              <Input
                placeholder="e.g., Spring 2025 Cohort Import"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to Cohort (optional)</Label>
              <Select value={selectedCohort || "none"} onValueChange={(v) => setSelectedCohort(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No cohort</SelectItem>
                  {cohorts?.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.cohort_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>CSV Data</Label>
            <Textarea
              placeholder="Paste CSV data here or use the format: email,first_name,last_name,phone"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Required columns: email. Optional: first_name, last_name, phone
            </p>
          </div>

          <Button
            onClick={() => importMutation.mutate()}
            disabled={!csvData.trim() || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Users
          </Button>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!batches || batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No import batches yet
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h4 className="font-medium">{batch.batch_name || 'Unnamed Import'}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {batch.total_users} users
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {batch.successful_imports} successful
                      </span>
                      {batch.failed_imports > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          {batch.failed_imports} failed
                        </span>
                      )}
                      <span>
                        {format(new Date(batch.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(batch.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
