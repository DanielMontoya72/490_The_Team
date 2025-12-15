import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { JobImportFromUrl } from './JobImportFromUrl';
import { createDefaultTodos } from '@/lib/default-todos';
import { createDefaultReminders } from '@/lib/default-reminders';

// Helper function to apply automation rules to a newly created job
async function applyAutomationRules(job: any, userId: string) {
  try {
    // Fetch active automation rules
    const { data: rules, error: rulesError } = await supabase
      .from('application_automation_rules' as any)
      .select('*')
      .eq('is_active', true);

    if (rulesError || !rules || rules.length === 0) return;

    // Find matching rule - strict matching on ALL conditions
    const matchingRule = (rules as any[]).find((rule: any) => {
      const conditions = rule.conditions as any;
      const jobIndustry = job.industry?.toLowerCase().trim() || '';
      const jobType = job.job_type?.toLowerCase().trim() || '';
      const ruleIndustry = conditions.industry?.toLowerCase().trim() || '';
      const ruleJobType = conditions.jobType?.toLowerCase().trim() || '';
      
      // ALL specified conditions must match exactly
      const industryMatch = !ruleIndustry || jobIndustry === ruleIndustry;
      const jobTypeMatch = !ruleJobType || jobType === ruleJobType;
      
      return industryMatch && jobTypeMatch;
    });

    if (!matchingRule) {
      console.log('No matching automation rule found for this job');
      return;
    }

    const actions = matchingRule.actions as any;

    // 1. Create application package with materials
    if (actions.resume_id || actions.cover_letter_id || actions.portfolio_projects) {
      await supabase
        .from('application_packages' as any)
        .insert({
          job_id: job.id,
          user_id: userId,
          resume_id: actions.resume_id || null,
          cover_letter_id: actions.cover_letter_id || null,
          portfolio_urls: actions.portfolio_projects || [],
          package_status: 'draft'
        });
      
      console.log('Application package created with automation rule');
    }

    // 2. Create checklist with default items
    if (actions.checklist_template && Array.isArray(actions.checklist_template)) {
      const checklistItems = actions.checklist_template.map((text: string) => ({
        id: crypto.randomUUID(),
        text,
        completed: false
      }));

      await supabase
        .from('application_checklists' as any)
        .insert({
          job_id: job.id,
          user_id: userId,
          checklist_items: checklistItems,
          completion_percentage: 0
        });
    }

    // 3. Create reminders
    if (actions.reminder_defaults?.followUpDays) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + actions.reminder_defaults.followUpDays);
      
      await supabase
        .from('deadline_reminders' as any)
        .insert({
          job_id: job.id,
          user_id: userId,
          reminder_date: followUpDate.toISOString(),
          reminder_type: actions.reminder_defaults.reminderType || 'email',
          is_sent: false
        });
    }

    console.log('Automation rules applied successfully to job:', job.id);
  } catch (error) {
    console.error('Error applying automation rules:', error);
    // Don't throw - we don't want to block job creation if automation fails
  }
}

interface SimpleJobFormProps {
  onSuccess: () => void;
}

export function SimpleJobForm({ onSuccess }: SimpleJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    location: '',
    job_url: '',
    linkedin_profile_url: '',
    job_description: '',
    salary_range_min: '',
    salary_range_max: '',
    application_deadline: '',
    job_type: '',
    industry: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        ...formData,
        user_id: user.id,
        status: 'Interested',
        salary_range_min: formData.salary_range_min ? parseInt(formData.salary_range_min) : null,
        salary_range_max: formData.salary_range_max ? parseInt(formData.salary_range_max) : null,
        application_deadline: formData.application_deadline || null
      };

      const { data: newJob, error } = await supabase
        .from('jobs' as any)
        .insert([payload as any])
        .select()
        .single();
        
      if (error) throw error;

      // Apply automation rules if any match
      if (newJob) {
        await applyAutomationRules(newJob, user.id);
        // Create default to-do items
        await createDefaultTodos((newJob as any).id, user.id);
        // Create default follow-up reminders
        await createDefaultReminders((newJob as any).id, user.id);
      }

      toast.success('Job added successfully');
      onSuccess();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImport = (importedData: any) => {
    // Convert null values to empty strings to prevent crashes
    const cleanedData = Object.entries(importedData).reduce((acc, [key, value]) => {
      acc[key] = value === null || value === undefined ? '' : String(value);
      return acc;
    }, {} as Record<string, string>);

    setFormData(prev => ({
      ...prev,
      ...cleanedData
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <JobImportFromUrl onDataImported={handleImport} />
      
      <div className="grid grid-cols-2 gap-4 px-1">
        <div className="space-y-2">
          <Label htmlFor="job_title">Job Title *</Label>
          <Input
            id="job_title"
            value={formData.job_title}
            onChange={(e) => handleChange('job_title', e.target.value)}
            placeholder="Senior Software Engineer"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => handleChange('company_name', e.target.value)}
            placeholder="Tech Corp Inc."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="San Francisco, CA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="job_url">Job Posting URL</Label>
          <Input
            id="job_url"
            type="url"
            value={formData.job_url}
            onChange={(e) => handleChange('job_url', e.target.value)}
            placeholder="https://example.com/job"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Consulting">Consulting</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job_type">Job Type</Label>
          <Select value={formData.job_type} onValueChange={(value) => handleChange('job_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Freelance">Freelance</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary_range_min">Minimum Salary</Label>
          <Input
            id="salary_range_min"
            type="number"
            value={formData.salary_range_min}
            onChange={(e) => handleChange('salary_range_min', e.target.value)}
            placeholder="80000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary_range_max">Maximum Salary</Label>
          <Input
            id="salary_range_max"
            type="number"
            value={formData.salary_range_max}
            onChange={(e) => handleChange('salary_range_max', e.target.value)}
            placeholder="120000"
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="application_deadline">Application Deadline</Label>
          <DatePicker
            date={formData.application_deadline ? new Date(formData.application_deadline) : null}
            onSelect={(date) => handleChange('application_deadline', date ? date.toISOString().split('T')[0] : '')}
            placeholder="Select deadline"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job_description">
          Job Description {formData.job_description && formData.job_description.length > 0 && `(${formData.job_description.length}/2000 characters)`}
        </Label>
        <Textarea
          id="job_description"
          value={formData.job_description}
          onChange={(e) => {
            if (e.target.value.length <= 2000) {
              handleChange('job_description', e.target.value);
            }
          }}
          maxLength={2000}
          rows={6}
          placeholder="Enter job description (max 2000 characters)"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black">
          {loading ? 'Saving...' : 'Save Job'}
        </Button>
      </div>
    </form>
  );
}
