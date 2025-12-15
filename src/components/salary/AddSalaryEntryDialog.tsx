import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddSalaryEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSalaryEntryDialog({ open, onOpenChange, onSuccess }: AddSalaryEntryDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    location: '',
    industry: '',
    base_salary: '',
    bonus: '',
    equity_value: '',
    benefits_value: '',
    start_date: '',
    end_date: '',
    is_current: false,
    salary_type: 'current',
    negotiation_attempted: false,
    negotiation_successful: false,
    original_offer: '',
    final_offer: '',
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const baseSalary = parseInt(formData.base_salary) || 0;
      const bonus = parseInt(formData.bonus) || 0;
      const equity = parseInt(formData.equity_value) || 0;
      const benefits = parseInt(formData.benefits_value) || 0;
      const totalComp = baseSalary + bonus + equity + benefits;

      // If marking as current, unset other current entries
      if (formData.is_current) {
        await supabase
          .from('salary_progression')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .eq('is_current', true);
      }

      const { error } = await supabase
        .from('salary_progression')
        .insert({
          user_id: user.id,
          job_title: formData.job_title,
          company_name: formData.company_name || null,
          location: formData.location || null,
          industry: formData.industry || null,
          base_salary: baseSalary,
          bonus: bonus,
          equity_value: equity,
          benefits_value: benefits,
          total_compensation: totalComp,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          is_current: formData.is_current,
          salary_type: formData.salary_type,
          negotiation_attempted: formData.negotiation_attempted,
          negotiation_successful: formData.negotiation_successful || null,
          original_offer: formData.original_offer ? parseInt(formData.original_offer) : null,
          final_offer: formData.final_offer ? parseInt(formData.final_offer) : null,
          notes: formData.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Salary Entry Added",
        description: "Your salary entry has been saved successfully.",
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        job_title: '',
        company_name: '',
        location: '',
        industry: '',
        base_salary: '',
        bonus: '',
        equity_value: '',
        benefits_value: '',
        start_date: '',
        end_date: '',
        is_current: false,
        salary_type: 'current',
        negotiation_attempted: false,
        negotiation_successful: false,
        original_offer: '',
        final_offer: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Salary Entry</DialogTitle>
          <DialogDescription>
            Track your salary history for comprehensive analytics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Job Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title *</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Company</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Inc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="space-y-4">
            <h4 className="font-medium">Compensation</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_salary">Base Salary *</Label>
                <Input
                  id="base_salary"
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus">Annual Bonus</Label>
                <Input
                  id="bonus"
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equity_value">Equity Value (Annual)</Label>
                <Input
                  id="equity_value"
                  type="number"
                  value={formData.equity_value}
                  onChange={(e) => setFormData({ ...formData, equity_value: e.target.value })}
                  placeholder="20000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefits_value">Benefits Value (Annual)</Label>
                <Input
                  id="benefits_value"
                  type="number"
                  value={formData.benefits_value}
                  onChange={(e) => setFormData({ ...formData, benefits_value: e.target.value })}
                  placeholder="15000"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h4 className="font-medium">Duration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={formData.is_current}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_current"
                checked={formData.is_current}
                onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked, end_date: '' })}
              />
              <Label htmlFor="is_current">This is my current position</Label>
            </div>
          </div>

          {/* Entry Type */}
          <div className="space-y-2">
            <Label htmlFor="salary_type">Entry Type</Label>
            <Select
              value={formData.salary_type}
              onValueChange={(value) => setFormData({ ...formData, salary_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Salary</SelectItem>
                <SelectItem value="offer">Job Offer</SelectItem>
                <SelectItem value="historical">Historical Record</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Negotiation */}
          <div className="space-y-4">
            <h4 className="font-medium">Negotiation Details</h4>
            <div className="flex items-center gap-2">
              <Switch
                id="negotiation_attempted"
                checked={formData.negotiation_attempted}
                onCheckedChange={(checked) => setFormData({ ...formData, negotiation_attempted: checked })}
              />
              <Label htmlFor="negotiation_attempted">I negotiated this offer</Label>
            </div>

            {formData.negotiation_attempted && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    id="negotiation_successful"
                    checked={formData.negotiation_successful}
                    onCheckedChange={(checked) => setFormData({ ...formData, negotiation_successful: checked })}
                  />
                  <Label htmlFor="negotiation_successful">Negotiation was successful</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="original_offer">Original Offer</Label>
                    <Input
                      id="original_offer"
                      type="number"
                      value={formData.original_offer}
                      onChange={(e) => setFormData({ ...formData, original_offer: e.target.value })}
                      placeholder="90000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="final_offer">Final Offer</Label>
                    <Input
                      id="final_offer"
                      type="number"
                      value={formData.final_offer}
                      onChange={(e) => setFormData({ ...formData, final_offer: e.target.value })}
                      placeholder="100000"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details about this position or compensation..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.job_title || !formData.base_salary || !formData.start_date || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
