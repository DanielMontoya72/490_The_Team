import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Zap, Package, MessageSquare, Settings } from 'lucide-react';

interface ApplicationWorkflowAutomationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
}

export function ApplicationWorkflowAutomation({ open, onOpenChange, jobId }: ApplicationWorkflowAutomationProps) {
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [questionTemplates, setQuestionTemplates] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'package_generation',
    conditions: { industry: '', jobType: '' },
    actions: { 
      resume_id: '', 
      cover_letter_id: '', 
      portfolio_projects: [] as string[],
      reminder_defaults: {
        followUpDays: 7,
        reminderType: 'email'
      }
    },
    is_active: true
  });
  const [newTemplate, setNewTemplate] = useState({
    question: '',
    answer: '',
    category: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (open) {
      fetchAutomationRules();
      fetchQuestionTemplates();
      fetchApplicationMaterials();
      fetchProjects();
    }
  }, [open]);

  const fetchAutomationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('application_automation_rules' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomationRules(data || []);
    } catch (error) {
      console.error('Error fetching automation rules:', error);
      toast.error('Failed to load automation rules');
    }
  };

  const fetchQuestionTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('application_question_templates' as any)
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setQuestionTemplates(data || []);
    } catch (error) {
      console.error('Error fetching question templates:', error);
      toast.error('Failed to load question templates');
    }
  };

  const fetchApplicationMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: resumeData } = await supabase
        .from('application_materials' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('material_type', 'resume')
        .order('created_at', { ascending: false });

      setResumes(resumeData || []);

      const { data: coverLetterData } = await supabase
        .from('application_materials' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('material_type', 'cover_letter')
        .order('created_at', { ascending: false });

      setCoverLetters(coverLetterData || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createPackageGenerationRule = async () => {
    if (!newRule.rule_name) {
      toast.error('Please enter a rule name');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('application_automation_rules' as any)
        .insert({
          ...newRule,
          user_id: user.id,
          rule_type: 'package_generation'
        });

      if (error) throw error;

      toast.success('Package generation rule created');
      setNewRule({
        rule_name: '',
        rule_type: 'package_generation',
        conditions: { industry: '', jobType: '' },
        actions: { 
          resume_id: '', 
          cover_letter_id: '', 
          portfolio_projects: [],
          reminder_defaults: {
            followUpDays: 7,
            reminderType: 'email'
          }
        },
        is_active: true
      });
      fetchAutomationRules();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      toast.error(error.message || 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const createQuestionTemplate = async () => {
    if (!newTemplate.question || !newTemplate.answer) {
      toast.error('Please enter both question and answer');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('application_question_templates' as any)
        .insert({
          ...newTemplate,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Question template created');
      setNewTemplate({
        question: '',
        answer: '',
        category: '',
        tags: []
      });
      fetchQuestionTemplates();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(error.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('application_automation_rules' as any)
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast.success('Rule deleted');
      fetchAutomationRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('application_question_templates' as any)
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted');
      fetchQuestionTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('application_automation_rules' as any)
        .update({ is_active: !isActive })
        .eq('id', ruleId);

      if (error) throw error;
      fetchAutomationRules();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const toggleProjectInRule = (projectUrl: string) => {
    const portfolio = newRule.actions.portfolio_projects;
    if (portfolio.includes(projectUrl)) {
      setNewRule({
        ...newRule,
        actions: {
          ...newRule.actions,
          portfolio_projects: portfolio.filter(url => url !== projectUrl)
        }
      });
    } else {
      setNewRule({
        ...newRule,
        actions: {
          ...newRule.actions,
          portfolio_projects: [...portfolio, projectUrl]
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Automation Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="package-rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="package-rules">
              <Package className="h-4 w-4 mr-2" />
              Package Rules
            </TabsTrigger>
            <TabsTrigger value="questions">
              <MessageSquare className="h-4 w-4 mr-2" />
              Question Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="package-rules" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Package Generation Rule</CardTitle>
                <CardDescription>
                  Define which resume, cover letter, and portfolio projects to use for specific job types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    placeholder="e.g., Data Science Roles"
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry (Condition)</Label>
                    <Select
                      value={newRule.conditions.industry}
                      onValueChange={(value) => setNewRule({
                        ...newRule,
                        conditions: { ...newRule.conditions, industry: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Job Type (Condition)</Label>
                    <Select
                      value={newRule.conditions.jobType}
                      onValueChange={(value) => setNewRule({
                        ...newRule,
                        conditions: { ...newRule.conditions, jobType: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resume to Use</Label>
                  <Select
                    value={newRule.actions.resume_id}
                    onValueChange={(value) => setNewRule({
                      ...newRule,
                      actions: { ...newRule.actions, resume_id: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cover Letter</Label>
                  <Select
                    value={newRule.actions.cover_letter_id}
                    onValueChange={(value) => setNewRule({
                      ...newRule,
                      actions: { ...newRule.actions, cover_letter_id: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cover letter" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverLetters.map((coverLetter) => (
                        <SelectItem key={coverLetter.id} value={coverLetter.id}>
                          {coverLetter.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {coverLetters.length === 0 && (
                    <p className="text-xs text-muted-foreground">No cover letters found. Create one in the Cover Letters section.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Portfolio Projects</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <div key={project.id} className="flex items-center gap-2">
                          <Switch
                            checked={newRule.actions.portfolio_projects.includes(project.project_url || project.repository_link)}
                            onCheckedChange={() => toggleProjectInRule(project.project_url || project.repository_link)}
                          />
                          <span className="text-sm flex-1">{project.project_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.industry || project.project_type}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No projects found. Add projects in your profile.</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium text-sm">Automated Reminders</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Follow-up Days</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="7"
                        value={newRule.actions.reminder_defaults.followUpDays}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actions: {
                            ...newRule.actions,
                            reminder_defaults: {
                              ...newRule.actions.reminder_defaults,
                              followUpDays: parseInt(e.target.value) || 7
                            }
                          }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reminder Type</Label>
                      <Select
                        value={newRule.actions.reminder_defaults.reminderType}
                        onValueChange={(value) => setNewRule({
                          ...newRule,
                          actions: {
                            ...newRule.actions,
                            reminder_defaults: {
                              ...newRule.actions.reminder_defaults,
                              reminderType: value
                            }
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email Notification</SelectItem>
                          <SelectItem value="push">Push Notification</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={createPackageGenerationRule} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Active Rules
              </h3>
              {automationRules.filter(r => r.rule_type === 'package_generation').map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.rule_name}</h4>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {rule.conditions.industry && (
                            <p>Industry: {rule.conditions.industry}</p>
                          )}
                          {rule.conditions.jobType && (
                            <p>Job Type: {rule.conditions.jobType}</p>
                          )}
                          {rule.actions.portfolio_projects?.length > 0 && (
                            <p>Portfolio Items: {rule.actions.portfolio_projects.length}</p>
                          )}
                          {rule.actions.reminder_defaults && (
                            <p>Reminder: {rule.actions.reminder_defaults.followUpDays} days ({rule.actions.reminder_defaults.reminderType})</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRuleActive(rule.id, rule.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {automationRules.filter(r => r.rule_type === 'package_generation').length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No package generation rules yet. Create one above to automate your application packages.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Question Template</CardTitle>
                <CardDescription>
                  Save common application question answers for quick reuse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    placeholder="e.g., Why do you want to work here?"
                    value={newTemplate.question}
                    onChange={(e) => setNewTemplate({ ...newTemplate, question: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea
                    placeholder="Your prepared answer..."
                    value={newTemplate.answer}
                    onChange={(e) => setNewTemplate({ ...newTemplate, answer: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g., Motivation, Experience, Skills"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  />
                </div>

                <Button onClick={createQuestionTemplate} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Saved Templates
              </h3>
              {questionTemplates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.question}</h4>
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.answer}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Used {template.usage_count || 0} times
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questionTemplates.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No question templates yet. Create one above to save common answers.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
