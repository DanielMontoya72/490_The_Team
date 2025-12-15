import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Archive, Trash2, Edit, Clock, ExternalLink, Zap, Activity, Package, CheckSquare, Bell, Target, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { ResponseTimePrediction } from './ResponseTimePrediction';
import { ApplicationQualityScore } from './ApplicationQualityScore';
import { ContactsManager } from './ContactsManager';
import { ApplicationMaterialsTab } from './ApplicationMaterialsTab';
import { CompanyInfoTab } from './CompanyInfoTab';
import { ApplicationStatusMonitor } from './ApplicationStatusMonitor';
import { ApplicationChecklist } from './ApplicationChecklist';
import { FollowUpReminders } from './FollowUpReminders';
import { SmartFollowUpReminders } from './SmartFollowUpReminders';
import { ApplicationPackageGenerator } from './ApplicationPackageGenerator';
import { InterviewScheduler } from './InterviewScheduler';
import { InterviewCalendar } from './InterviewCalendar';
import { InterviewList } from './InterviewList';
import { CompanyResearch } from './CompanyResearch';
import { InterviewQuestionBank } from './InterviewQuestionBank';
import { MockInterviewSession } from './MockInterviewSession';
import { JobMatchAnalysis } from './JobMatchAnalysis';
import { MatchScoreHistory } from './MatchScoreHistory';
import { JobMatchScore } from './JobMatchScore';
import { SkillGapAnalysis } from './SkillGapAnalysis';
import { SkillDevelopmentProgress } from './SkillDevelopmentProgress';
import { SalaryResearch } from './SalaryResearch';
import { SalaryNegotiationPrep } from './SalaryNegotiationPrep';
import { InterviewInsights } from './InterviewInsights';
import { WritingPracticeSession } from './WritingPracticeSession';
import { InterviewPreparationChecklist } from './InterviewPreparationChecklist';
import { InterviewFollowUp } from './InterviewFollowUp';
import { InterviewSuccessPredictionWrapper } from './InterviewSuccessPredictionWrapper';
import { BLSSalaryBenchmarks } from './BLSSalaryBenchmarks';
import { ApplicationEmailsTab } from '@/components/email/ApplicationEmailsTab';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { JobCompetitiveAnalysis } from './JobCompetitiveAnalysis';

interface JobDetailsDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: (jobId: string) => void;
  onDelete: (jobId: string) => void;
  onUpdate: () => void;
  initialTab?: string;
}

export function JobDetailsDialog({ job, open, onOpenChange, onArchive, onDelete, onUpdate, initialTab = 'details' }: JobDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [packageGeneratorOpen, setPackageGeneratorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<any>(null);
  const [emailSidebarOpen, setEmailSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    location: '',
    job_url: '',
    linkedin_profile_url: '',
    job_description: '',
    status: 'Interested',
    salary_range_min: '',
    salary_range_max: '',
    application_deadline: '',
    job_type: '',
    industry: '',
    company_website: '',
    company_description: '',
    company_size: '',
    company_rating: '',
    company_logo_url: '',
    notes: '',
    company_contact_email: '',
    company_contact_phone: '',
    salary_negotiation_notes: '',
    interview_notes: ''
  });

  useEffect(() => {
    if (job) {
      // Only reset the tab if it's a different job or dialog is newly opened
      const jobChanged = currentJobId !== job.id;
      if (jobChanged) {
        setCurrentJobId(job.id);
        setActiveTab(initialTab);
      }
      
      setFormData({
        job_title: job.job_title || '',
        company_name: job.company_name || '',
        location: job.location || '',
        job_url: job.job_url || '',
        linkedin_profile_url: job.linkedin_profile_url || '',
        job_description: job.job_description || '',
        status: job.status || 'Interested',
        salary_range_min: job.salary_range_min || '',
        salary_range_max: job.salary_range_max || '',
        application_deadline: job.application_deadline || '',
        job_type: job.job_type || '',
        industry: job.industry || '',
        company_website: job.company_website || '',
        company_description: job.company_description || '',
        company_size: job.company_size || '',
        company_rating: job.company_rating || '',
        company_logo_url: job.company_logo_url || '',
        notes: job.notes || '',
        company_contact_email: job.company_contact_email || '',
        company_contact_phone: job.company_contact_phone || '',
        salary_negotiation_notes: job.salary_negotiation_notes || '',
        interview_notes: job.interview_notes || ''
      });
      
      if (jobChanged) {
        fetchStatusHistory();
        fetchSkillGapAnalysis();
      }
    }
  }, [job, initialTab]);

  const fetchStatusHistory = async () => {
    if (!job?.id) return;
    try {
      const { data, error } = await supabase
        .from('job_status_history' as any)
        .select('*')
        .eq('job_id', job.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  };

  const fetchSkillGapAnalysis = async () => {
    if (!job?.id) return;
    try {
      const { data, error } = await supabase
        .from('skill_gap_analyses')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      console.log('Skill Gap Analysis Data:', data);
      setSkillGapAnalysis(data);
    } catch (error) {
      console.error('Error fetching skill gap analysis:', error);
    }
  };

  const handleSave = async () => {
    if (!job?.id) return;
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        salary_range_min: formData.salary_range_min ? parseInt(formData.salary_range_min) : null,
        salary_range_max: formData.salary_range_max ? parseInt(formData.salary_range_max) : null,
        company_rating: formData.company_rating ? parseFloat(formData.company_rating) : null,
        application_deadline: formData.application_deadline || null
      };

      // Track status change if status has changed
      const statusChanged = job.status !== formData.status;
      
      const { data, error } = await supabase
        .from('jobs' as any)
        .update(payload)
        .eq('id', job.id)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      // Create status history record if status changed
      if (statusChanged && data && data[0]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('job_status_history' as any)
            .insert({
              job_id: job.id,
              user_id: user.id,
              from_status: job.status,
              to_status: formData.status,
              changed_at: new Date().toISOString()
            });
          
          // Refresh status history to show the new entry
          fetchStatusHistory();
        }
      }
      
      toast.success('Job updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating job:', error);
      const errorMessage = error?.message || 'Failed to update job';
      toast.error(`Failed to update job: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Interested': 'default',
      'Applied': 'secondary',
      'Phone Screen': 'default',
      'Interview': 'default',
      'Offer Received': 'default',
      'Rejected': 'destructive',
    };
    return colors[status] || 'default';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] sm:w-[95vw] max-h-[95vh] overflow-hidden flex p-0 bg-gradient-to-br from-background via-background to-muted/30">
        {job && (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4">
            <DialogHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-2xl sm:text-3xl font-bold mb-3 break-words bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {job.job_title}
                  </DialogTitle>
                  <p className="text-muted-foreground text-base sm:text-lg break-words font-medium">{job.company_name}</p>
                </div>
              </div>
              
              {/* Action buttons with enhanced styling */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onArchive(job.id)} 
                  className="flex items-center gap-2 flex-1 sm:flex-none hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/50 transition-all duration-200"
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden xs:inline">Archive</span>
                </Button>
                <Button 
                  variant={isEditing ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={`flex items-center gap-2 flex-1 sm:flex-none transition-all duration-200 ${
                    isEditing 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30' 
                      : 'hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/50'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden xs:inline">{isEditing ? 'Editing' : 'Edit'}</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(job.id)} 
                  className="flex items-center gap-2 flex-1 sm:flex-none hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden xs:inline">Delete</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEmailSidebarOpen(!emailSidebarOpen)} 
                  className={`flex items-center gap-2 flex-1 sm:flex-none transition-all duration-200 ${
                    emailSidebarOpen 
                      ? 'bg-sky-500/20 text-sky-600 border-sky-500/50' 
                      : 'hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/50'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden xs:inline">Emails</span>
                </Button>
              </div>
            </DialogHeader>
            </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="flex flex-wrap w-full gap-2 h-auto p-3 bg-gradient-to-r from-muted/50 to-muted/80 backdrop-blur-sm rounded-lg shadow-md">
            <TabsTrigger 
              value="details" 
              className="text-sm px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-200 hover:bg-muted/80 font-medium rounded-md min-w-[90px]"
            >
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="company" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Company
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Contacts
            </TabsTrigger>
            <TabsTrigger 
              value="interviews" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Interviews
            </TabsTrigger>
            <TabsTrigger 
              value="materials" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Materials
            </TabsTrigger>
            <TabsTrigger 
              value="status" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Status
            </TabsTrigger>
            <TabsTrigger 
              value="checklist" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Checklist
            </TabsTrigger>
            <TabsTrigger 
              value="reminders" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Reminders
            </TabsTrigger>
            <TabsTrigger 
              value="skills" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Skills
            </TabsTrigger>
            <TabsTrigger 
              value="match" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Job Match
            </TabsTrigger>
            <TabsTrigger 
              value="salary" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Salary Research
            </TabsTrigger>
            <TabsTrigger 
              value="negotiation" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Negotiation
            </TabsTrigger>
            <TabsTrigger 
              value="emails" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Emails
            </TabsTrigger>
            <TabsTrigger 
              value="competitive" 
              className="text-xs sm:text-sm px-4 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 transition-all duration-200 hover:bg-muted/80 font-medium"
            >
              Competitive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 py-6 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-muted-foreground">Job Title</Label>
                {isEditing ? (
                  <Input value={formData.job_title} onChange={(e) => handleChange('job_title', e.target.value)} className="border-2 focus:border-blue-500 transition-colors" />
                ) : (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/80 font-medium">{formData.job_title}</div>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-muted-foreground">Company Name</Label>
                {isEditing ? (
                  <Input value={formData.company_name} onChange={(e) => handleChange('company_name', e.target.value)} className="border-2 focus:border-blue-500 transition-colors" />
                ) : (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/80 font-medium">{formData.company_name}</div>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger className="border-2 focus:border-blue-500 transition-colors"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Phone Screen">Phone Screen</SelectItem>
                      <SelectItem value="Interview">Interview</SelectItem>
                      <SelectItem value="Offer Received">Offer Received</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3">
                    <Badge 
                      variant={getStatusColor(formData.status) as any} 
                      className="text-base font-semibold px-4 py-2 text-center tracking-normal"
                    >
                      {formData.status}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-muted-foreground">Location</Label>
                {isEditing ? (
                  <Input value={formData.location} onChange={(e) => handleChange('location', e.target.value)} className="border-2 focus:border-blue-500 transition-colors" />
                ) : (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/80 font-medium">{formData.location || 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-muted-foreground">Industry</Label>
                {isEditing ? (
                  <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 rounded bg-muted">{formData.industry || 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Job Type</Label>
                {isEditing ? (
                  <Select value={formData.job_type} onValueChange={(value) => handleChange('job_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 rounded bg-muted">{formData.job_type || 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Minimum Salary</Label>
                {isEditing ? (
                  <Input type="number" value={formData.salary_range_min} onChange={(e) => handleChange('salary_range_min', e.target.value)} />
                ) : (
                  <div className="p-2 rounded bg-muted">{formData.salary_range_min ? `$${parseInt(formData.salary_range_min).toLocaleString()}` : 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Maximum Salary</Label>
                {isEditing ? (
                  <Input type="number" value={formData.salary_range_max} onChange={(e) => handleChange('salary_range_max', e.target.value)} />
                ) : (
                  <div className="p-2 rounded bg-muted">{formData.salary_range_max ? `$${parseInt(formData.salary_range_max).toLocaleString()}` : 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Application Deadline</Label>
                {isEditing ? (
                  <DatePicker
                    date={formData.application_deadline ? new Date(formData.application_deadline) : null}
                    onSelect={(date) => handleChange('application_deadline', date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Select deadline"
                  />
                ) : (
                  <div className="p-2 rounded bg-muted">{formData.application_deadline ? new Date(formData.application_deadline).toLocaleDateString() : 'N/A'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Job Posting URL</Label>
                {isEditing ? (
                  <Input value={formData.job_url} onChange={(e) => handleChange('job_url', e.target.value)} />
                ) : (
                  <div className="p-2">
                    {formData.job_url ? (
                      <a href={formData.job_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        View Posting <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : 'N/A'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>LinkedIn Profile URL</Label>
                {isEditing ? (
                  <Input value={formData.linkedin_profile_url} onChange={(e) => handleChange('linkedin_profile_url', e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
                ) : (
                  <div className="p-2">
                    {formData.linkedin_profile_url ? (
                      <a href={formData.linkedin_profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        View LinkedIn Profile <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : 'N/A'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Description ({formData.job_description.length}/2000)</Label>
              {isEditing ? (
                <Textarea 
                  value={formData.job_description} 
                  onChange={(e) => e.target.value.length <= 2000 && handleChange('job_description', e.target.value)}
                  rows={6}
                  maxLength={2000}
                />
              ) : (
                <div className="p-3 rounded bg-muted whitespace-pre-line">{formData.job_description || 'No description provided'}</div>
              )}
            </div>

            {/* Response Time Prediction */}
            <ResponseTimePrediction
              jobId={job.id}
              company={job.company_name}
              industry={job.industry}
              companySize={job.company_size}
              jobLevel={job.job_type === 'Internship' ? 'Entry' : job.job_type === 'Senior' ? 'Senior' : 'Mid'}
              appliedDate={job.status === 'Applied' || job.status === 'Interview' || job.status === 'Phone Screen' ? job.updated_at : undefined}
              status={job.status}
            />

            {/* Application Quality Score */}
            <ApplicationQualityScore
              jobId={job.id}
              jobTitle={job.job_title}
              companyName={job.company_name}
              jobDescription={job.job_description}
            />

            {isEditing && (
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="company" className="space-y-4 py-4">
            {!isEditing ? (
              <CompanyInfoTab job={job} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Website</Label>
                  <Input value={formData.company_website} onChange={(e) => handleChange('company_website', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company Description</Label>
                  <Textarea value={formData.company_description} onChange={(e) => handleChange('company_description', e.target.value)} rows={6} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Input value={formData.company_size} onChange={(e) => handleChange('company_size', e.target.value)} placeholder="e.g., 1000-5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Rating</Label>
                    <Input type="number" step="0.1" min="0" max="5" value={formData.company_rating} onChange={(e) => handleChange('company_rating', e.target.value)} placeholder="e.g., 4.2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Logo URL</Label>
                  <Input value={formData.company_logo_url} onChange={(e) => handleChange('company_logo_url', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Personal Notes</Label>
              {isEditing ? (
                <Textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={8} />
              ) : (
                <div className="p-3 rounded bg-muted whitespace-pre-line min-h-[200px]">{formData.notes || 'No notes added'}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4 py-4">
            <ContactsManager jobId={job?.id} companyName={job?.company_name} isEditing={isEditing} />
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4 py-4">
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="schedule">Schedule & List</TabsTrigger>
                <TabsTrigger value="questions">Question Bank</TabsTrigger>
                <TabsTrigger value="mock">Mock Interview</TabsTrigger>
                <TabsTrigger value="insights">Interview Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="schedule" className="space-y-6">
                <InterviewScheduler 
                  jobId={job.id}
                  jobTitle={job.job_title}
                  companyName={job.company_name}
                />
                <InterviewList jobId={job.id} />
              </TabsContent>
              
              <TabsContent value="questions" className="space-y-4">
                <InterviewQuestionBank jobId={job.id} />
              </TabsContent>
              
              <TabsContent value="mock" className="space-y-4">
                <MockInterviewSession jobId={job.id} />
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                <InterviewInsights jobId={job.id} />
              </TabsContent>
            </Tabs>
            
            <div className="space-y-4 mt-6 pt-6 border-t">
              <div className="space-y-2">
                <Label>Interview Notes</Label>
                {isEditing ? (
                  <Textarea value={formData.interview_notes} onChange={(e) => handleChange('interview_notes', e.target.value)} rows={6} />
                ) : (
                  <div className="p-3 rounded bg-muted whitespace-pre-line min-h-[150px]">{formData.interview_notes || 'No interview notes'}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Salary Negotiation Notes</Label>
                {isEditing ? (
                  <Textarea value={formData.salary_negotiation_notes} onChange={(e) => handleChange('salary_negotiation_notes', e.target.value)} rows={6} />
                ) : (
                  <div className="p-3 rounded bg-muted whitespace-pre-line min-h-[150px]">{formData.salary_negotiation_notes || 'No negotiation notes'}</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preparation" className="space-y-6 py-4">
            <InterviewList jobId={job.id} />
            <InterviewSuccessPredictionWrapper jobId={job.id} />
            <WritingPracticeSession jobId={job.id} />
            <CompanyResearch 
              jobId={job.id} 
              onManageMaterials={() => setActiveTab('materials')}
            />
          </TabsContent>

          <TabsContent value="match" className="space-y-6 py-4">
            <JobMatchAnalysis jobId={job.id} />
            <MatchScoreHistory jobId={job.id} />
          </TabsContent>

          <TabsContent value="skills" className="space-y-6 py-4">
            {/* Skills Overview Card */}
            {skillGapAnalysis && (
              <div className="rounded-lg border bg-card shadow-sm">
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Target className="h-6 w-6 text-primary" />
                      Skills Overview
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your skill match for this position
                    </p>
                  </div>

                  {/* Quick Stats */}
                  {(skillGapAnalysis.matching_skills || skillGapAnalysis.missing_skills) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Skills You Have</p>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {Array.isArray(skillGapAnalysis.matching_skills) ? skillGapAnalysis.matching_skills.length : 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-8 w-8 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Skills to Learn</p>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {Array.isArray(skillGapAnalysis.missing_skills) ? skillGapAnalysis.missing_skills.length : 0}
                          </p>
                        </div>
                      </div>
                      {skillGapAnalysis.estimated_learning_time_weeks && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Clock className="h-8 w-8 text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Est. Learning Time</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                              {skillGapAnalysis.estimated_learning_time_weeks} weeks
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Matching Skills */}
                    {skillGapAnalysis.matching_skills && Array.isArray(skillGapAnalysis.matching_skills) && skillGapAnalysis.matching_skills.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <h4 className="font-semibold">Matching Skills</h4>
                          <Badge variant="secondary" className="ml-auto">
                            {skillGapAnalysis.matching_skills.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {skillGapAnalysis.matching_skills.map((skill: any, index: number) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 px-3 py-1.5 text-sm"
                            >
                              {typeof skill === 'string' ? skill : (skill.skill || skill.name || skill.skill_name)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {skillGapAnalysis.missing_skills && Array.isArray(skillGapAnalysis.missing_skills) && skillGapAnalysis.missing_skills.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <h4 className="font-semibold">Skills to Develop</h4>
                          <Badge variant="secondary" className="ml-auto">
                            {skillGapAnalysis.missing_skills.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {skillGapAnalysis.missing_skills.map((skill: any, index: number) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 px-3 py-1.5 text-sm"
                            >
                              {typeof skill === 'string' ? skill : (skill.skill || skill.name || skill.skill_name)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!skillGapAnalysis.matching_skills && !skillGapAnalysis.missing_skills && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No skills analysis available yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full Analysis Component */}
            <SkillGapAnalysis jobId={job.id} />
          </TabsContent>

          <TabsContent value="salary" className="space-y-4 py-4">
            <BLSSalaryBenchmarks 
              jobTitle={job.job_title} 
              location={job.location}
              currentSalaryMin={job.salary_range_min}
              currentSalaryMax={job.salary_range_max}
            />
            <SalaryResearch jobId={job.id} />
          </TabsContent>

          <TabsContent value="negotiation" className="space-y-4 py-4">
            <SalaryNegotiationPrep jobId={job.id} />
          </TabsContent>

          <TabsContent value="interview-preparation" className="space-y-4 py-4">
            <InterviewPreparationChecklist interviewId={job.id} />
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 py-4">
            <ApplicationMaterialsTab jobId={job?.id} />
          </TabsContent>

          <TabsContent value="status" className="space-y-4 py-4">
            <ApplicationStatusMonitor jobId={job?.id} />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4 py-4">
            <ApplicationChecklist jobId={job?.id} job={job} onTabChange={setActiveTab} />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4 py-4">
            <SmartFollowUpReminders 
              jobId={job?.id} 
              jobStatus={job?.status}
              companyName={job?.company_name}
              jobTitle={job?.job_title}
            />
            <FollowUpReminders jobId={job?.id} />
          </TabsContent>

          <TabsContent value="package" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Application Package</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate a complete application package for this job
                  </p>
                </div>
                <Button onClick={() => setPackageGeneratorOpen(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Generate Package
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emails" className="space-y-6 py-6 px-1">
            <ApplicationEmailsTab 
              jobId={job.id}
              jobTitle={job.job_title}
              companyName={job.company_name}
            />
          </TabsContent>

          <TabsContent value="competitive" className="space-y-4 py-4">
            <JobCompetitiveAnalysis jobId={job.id} />
          </TabsContent>

        </Tabs>

            {isEditing && (
              <div className="flex gap-3 pt-6 border-t border-border/50 mt-6">
                <Button 
                  onClick={handleSave} 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all duration-200"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </Button>
              </div>
            )}
            </div>
            </div>
            
            {/* Email Sidebar */}
            {emailSidebarOpen && (
              <EmailSidebar
                jobId={job.id}
                companyName={job.company_name}
                jobTitle={job.job_title}
                isOpen={emailSidebarOpen}
                onToggle={() => setEmailSidebarOpen(false)}
              />
            )}
          </div>
        )}
      </DialogContent>

      {job && (
        <ApplicationPackageGenerator
          open={packageGeneratorOpen}
          onOpenChange={setPackageGeneratorOpen}
          jobId={job.id}
          jobTitle={job.job_title}
          companyName={job.company_name}
        />
      )}
    </Dialog>
  );
}
