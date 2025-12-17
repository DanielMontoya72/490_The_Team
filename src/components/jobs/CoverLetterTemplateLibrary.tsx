import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Star, Eye, Briefcase, Palette, Code, TrendingUp, GraduationCap, Rocket, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Loader2, Plus, Upload, Share2, Settings, BarChart3, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CoverLetterTemplate {
  id: string;
  template_name: string;
  template_type: string;
  industry: string | null;
  content_structure: any;
  customization_settings: any;
  is_system_template: boolean;
  is_shared: boolean;
  usage_count: number;
  user_id: string | null;
}

interface CoverLetterTemplateLibraryProps {
  onSelectTemplate: (template: CoverLetterTemplate) => void;
}

export function CoverLetterTemplateLibrary({ onSelectTemplate }: CoverLetterTemplateLibraryProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<CoverLetterTemplate | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [generatingForJob, setGeneratingForJob] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedTemplateForAction, setSelectedTemplateForAction] = useState<CoverLetterTemplate | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'formal',
    industry: '',
    header: '',
    opening: '',
    body1: '',
    body2: '',
    closing: '',
    colorTheme: '#3B82F6',
    fontSize: '12',
    fontFamily: 'Times New Roman',
    lineSpacing: '1.5'
  });

  useEffect(() => {
    fetchTemplates();
    fetchJobs();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('cover_letter_templates')
        .select('*')
        .order('is_system_template', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleGenerateWithAI = async (template: CoverLetterTemplate, jobId: string) => {
    setGeneratingForJob(jobId);
    try {
      // Navigate to cover letter editor with template and job
      const params = new URLSearchParams({
        templateId: template.id,
        jobId: jobId,
        aiGenerate: 'true'
      });
      navigate(`/cover-letter/edit?${params.toString()}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to start AI generation');
    } finally {
      setGeneratingForJob(null);
    }
  };

  const filteredTemplates = selectedType === 'all' 
    ? templates 
    : selectedType === 'my_templates'
    ? templates.filter(t => !t.is_system_template)
    : templates.filter(t => t.template_type === selectedType);

  const templateTypes = [
    { value: 'all', label: 'All Templates', icon: Sparkles },
    { value: 'my_templates', label: 'My Templates', icon: Star },
    { value: 'formal', label: 'Formal', icon: Briefcase },
    { value: 'creative', label: 'Creative', icon: Palette },
    { value: 'technical', label: 'Technical', icon: Code },
    { value: 'sales', label: 'Sales', icon: TrendingUp },
    { value: 'academic', label: 'Academic', icon: GraduationCap },
    { value: 'startup', label: 'Startup', icon: Rocket }
  ];

  const getTemplateIcon = (type: string) => {
    const typeConfig = templateTypes.find(t => t.value === type);
    return typeConfig?.icon || FileText;
  };

  const getTemplateColor = (type: string) => {
    const colors: Record<string, string> = {
      formal: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
      creative: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
      technical: 'text-green-600 bg-green-50 dark:bg-green-950/30',
      sales: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
      academic: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30',
      startup: 'text-pink-600 bg-pink-50 dark:bg-pink-950/30'
    };
    return colors[type] || 'text-primary bg-primary/10';
  };

  const incrementUsageCount = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        await supabase
          .from('cover_letter_templates')
          .update({ usage_count: template.usage_count + 1 })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error('Error updating usage count:', error);
    }
  };

  const handleSelectTemplate = (template: CoverLetterTemplate) => {
    incrementUsageCount(template.id);
    onSelectTemplate(template);
  };

  const toggleExpanded = (templateId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const handleCreateTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cover_letter_templates')
        .insert({
          template_name: newTemplate.name,
          template_type: newTemplate.type,
          industry: newTemplate.industry,
          user_id: user.id,
          is_system_template: false,
          is_shared: false,
          usage_count: 0,
          content_structure: {
            header: newTemplate.header,
            opening: newTemplate.opening,
            body1: newTemplate.body1,
            body2: newTemplate.body2,
            closing: newTemplate.closing
          },
          customization_settings: {
            colorTheme: newTemplate.colorTheme,
            fontSize: newTemplate.fontSize,
            fontFamily: newTemplate.fontFamily,
            lineSpacing: newTemplate.lineSpacing
          }
        });

      if (error) throw error;
      
      toast.success('Custom template created successfully!');
      setCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        type: 'formal',
        industry: '',
        header: '',
        opening: '',
        body1: '',
        body2: '',
        closing: '',
        colorTheme: '#3B82F6',
        fontSize: '12',
        fontFamily: 'Times New Roman',
        lineSpacing: '1.5'
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to import templates');
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
        toast.error('Failed to read file');
      };

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          let templateData;

          // Handle different file types
          if (file.name.endsWith('.json')) {
            try {
              const parsed = JSON.parse(content);
              // Validate JSON structure
              if (!parsed.template_name || !parsed.content_structure) {
                throw new Error('Invalid template format. JSON must contain template_name and content_structure');
              }
              templateData = {
                template_name: parsed.template_name,
                template_type: parsed.template_type || 'formal',
                industry: parsed.industry || null,
                content_structure: parsed.content_structure,
                customization_settings: parsed.customization_settings || {
                  colorTheme: '#3B82F6',
                  fontSize: '12',
                  fontFamily: 'Times New Roman',
                  lineSpacing: '1.5'
                }
              };
            } catch (error) {
              toast.error('Invalid JSON format. Please check your file.');
              return;
            }
          } else if (file.name.endsWith('.txt')) {
            // For .txt files, parse sections by double line breaks
            const sections = content.split('\n\n').filter(s => s.trim());
            templateData = {
              template_name: file.name.replace('.txt', ''),
              template_type: 'formal',
              industry: null,
              content_structure: {
                header: sections[0] || '[Your Contact Information]',
                opening: sections[1] || '[Opening paragraph]',
                body1: sections[2] || '[First body paragraph]',
                body2: sections[3] || '[Second body paragraph]',
                closing: sections[4] || '[Closing paragraph]'
              },
              customization_settings: {
                colorTheme: '#3B82F6',
                fontSize: '12',
                fontFamily: 'Times New Roman',
                lineSpacing: '1.5'
              }
            };
          } else {
            toast.error('Unsupported file format. Please use .json or .txt files.');
            return;
          }

          // Insert template into database
          const { error } = await supabase
            .from('cover_letter_templates')
            .insert({
              template_name: templateData.template_name,
              template_type: templateData.template_type,
              industry: templateData.industry,
              content_structure: templateData.content_structure,
              customization_settings: templateData.customization_settings,
              user_id: user.id,
              is_system_template: false,
              is_shared: false,
              usage_count: 0
            });

          if (error) {
            console.error('Database error:', error);
            toast.error('Failed to save template to database');
            return;
          }
          
          toast.success('Template imported successfully!');
          setImportDialogOpen(false);
          fetchTemplates();
          
          // Reset file input
          event.target.value = '';
        } catch (error: any) {
          console.error('Error processing template:', error);
          toast.error(error.message || 'Failed to process template file');
        }
      };

      // Read file based on type
      if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        toast.error('Only .json and .txt files are supported for import');
      }
    } catch (error: any) {
      console.error('Error importing template:', error);
      toast.error(error.message || 'Failed to import template');
    }
  };

  const handleShareTemplate = async () => {
    if (!selectedTemplateForAction) return;

    try {
      const { error } = await supabase
        .from('cover_letter_templates')
        .update({ is_shared: true })
        .eq('id', selectedTemplateForAction.id);

      if (error) throw error;

      toast.success('Template is now public!');
      fetchTemplates();
    } catch (error) {
      console.error('Error sharing template:', error);
      toast.error('Failed to share template');
    }
  };

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/cover-letters?templateId=${selectedTemplateForAction?.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
    toast.success('Share link copied to clipboard!');
  };

  const handleCustomizeTemplate = async () => {
    if (!selectedTemplateForAction) return;

    try {
      const { error } = await supabase
        .from('cover_letter_templates')
        .update({
          customization_settings: {
            colorTheme: newTemplate.colorTheme,
            fontSize: newTemplate.fontSize,
            fontFamily: newTemplate.fontFamily,
            lineSpacing: newTemplate.lineSpacing
          }
        })
        .eq('id', selectedTemplateForAction.id);

      if (error) throw error;

      toast.success('Template customization saved!');
      setCustomizeDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error customizing template:', error);
      toast.error('Failed to customize template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Cover Letter Templates
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose from professionally crafted templates tailored to different industries and styles
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Custom Template
            </Button>
            <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Template
            </Button>
            <Button onClick={() => setAnalyticsDialogOpen(true)} variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </div>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 gap-2 bg-transparent h-auto p-0">
          {templateTypes.map((type) => {
            const Icon = type.icon;
            return (
              <TabsTrigger 
                key={type.value} 
                value={type.value}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.label}</span>
                <span className="sm:hidden">{type.label.substring(0, 3)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="h-1 bg-purple-400 rounded-full mt-2" />

        <div className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-4 px-1">
            {filteredTemplates.map((template) => {
              const TemplateIcon = getTemplateIcon(template.template_type);
              const colorClasses = getTemplateColor(template.template_type);
              
              return (
                <Card 
                  key={template.id} 
                  className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden border-2 hover:border-primary/50"
                >
                  <div className="h-2 bg-yellow-400" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-lg ${colorClasses} shrink-0`}>
                          <TemplateIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                            {template.template_name}
                          </CardTitle>
                          <CardDescription className="capitalize flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.template_type}
                            </Badge>
                            {template.industry && (
                              <span className="text-xs">• {template.industry}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      {template.is_system_template && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Official
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm bg-muted/50 rounded-lg p-4">
                      <div className="font-semibold text-xs uppercase text-muted-foreground flex items-center gap-2 mb-1">
                        <FileText className="h-3 w-3" />
                        Template Structure
                      </div>
                      <div className="space-y-2.5">
                        {(expandedCards.has(template.id) 
                          ? Object.entries(template.content_structure)
                          : Object.entries(template.content_structure).slice(0, 3)
                        ).map(([key, value]) => (
                          <div key={key} className="pl-3 border-l-2 border-primary/30 py-1">
                            <div className="font-medium text-xs capitalize text-foreground/80 mb-0.5">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                              {value as string}
                            </div>
                          </div>
                        ))}
                        {Object.keys(template.content_structure).length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(template.id)}
                            className="w-full text-xs h-7 hover:bg-primary/5"
                          >
                            {expandedCards.has(template.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Show {Object.keys(template.content_structure).length - 3} more sections
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {template.customization_settings?.colorTheme && (
                      <div className="flex items-center gap-2 text-sm bg-primary/5 px-3 py-2 rounded-lg">
                        <Palette className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">Custom Color:</span>
                        <div 
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: template.customization_settings.colorTheme }}
                        />
                        <span className="text-xs font-mono">{template.customization_settings.colorTheme}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{template.usage_count}</span>
                      <span className="text-xs">uses</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleSelectTemplate(template)}
                        className="flex-1 group/btn"
                      >
                        <FileText className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                        Use Template
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTemplateForAction(template);
                              setNewTemplate({
                                ...newTemplate,
                                colorTheme: template.customization_settings?.colorTheme || '#3B82F6',
                                fontSize: template.customization_settings?.fontSize || '12',
                                fontFamily: template.customization_settings?.fontFamily || 'Times New Roman',
                                lineSpacing: template.customization_settings?.lineSpacing || '1.5'
                              });
                              setCustomizeDialogOpen(true);
                            }}
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            Customize
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTemplateForAction(template);
                              setShareDialogOpen(true);
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="default"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            disabled={generatingForJob !== null}
                          >
                            {generatingForJob ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            AI Generate
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Select Job to Generate For</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {jobs.length > 0 ? (
                            jobs.map((job) => (
                              <DropdownMenuItem
                                key={job.id}
                                onClick={() => handleGenerateWithAI(template, job.id)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <span className="font-medium text-sm">{job.job_title}</span>
                                  <span className="text-xs text-muted-foreground">{job.company_name}</span>
                                </div>
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No active jobs found.
                              <br />Add a job first.
                            </div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setPreviewTemplate(template)}
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                No templates found for this category
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try selecting a different category
              </p>
            </div>
          )}
        </div>
      </Tabs>
      </div>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {previewTemplate && (
                <>
                  <div className={`p-3 rounded-lg ${getTemplateColor(previewTemplate.template_type)}`}>
                    {(() => {
                      const Icon = getTemplateIcon(previewTemplate.template_type);
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">{previewTemplate.template_name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {previewTemplate.template_type}
                      </Badge>
                      {previewTemplate.industry && (
                        <>
                          <span>•</span>
                          <span>{previewTemplate.industry}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-6 mt-6">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6 rounded-xl space-y-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1 w-8 bg-primary rounded-full" />
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                    Template Structure
                  </h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(previewTemplate.content_structure).map(([key, value], index) => (
                    <div 
                      key={key} 
                      className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-primary/10 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="font-semibold text-sm capitalize flex items-center gap-2">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {value as string}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {previewTemplate.customization_settings && Object.keys(previewTemplate.customization_settings).length > 0 && (
                <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-xl border border-blue-200/30 dark:border-blue-800/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">
                      Style Customization
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(previewTemplate.customization_settings).map(([key, value]) => (
                      <div key={key} className="bg-background/60 backdrop-blur-sm rounded-lg p-3 border border-primary/10">
                        <div className="text-xs font-medium text-muted-foreground capitalize mb-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        {key === 'colorTheme' ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border border-border"
                              style={{ backgroundColor: String(value) }}
                            />
                            <div className="text-sm font-semibold">{String(value)}</div>
                          </div>
                        ) : (
                          <div className="text-sm font-semibold">{String(value)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {previewTemplate.usage_count} {previewTemplate.usage_count === 1 ? 'use' : 'uses'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Popular choice among users
                    </div>
                  </div>
                </div>
                {previewTemplate.is_system_template && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Official Template
                  </Badge>
                )}
              </div>

              <Button 
                onClick={() => {
                  handleSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="w-full h-12 text-base group"
                size="lg"
              >
                <FileText className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                Use This Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
            <DialogDescription>
              Design your own cover letter template with custom structure and styling
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g., My Custom Template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-type">Template Type</Label>
                <Select value={newTemplate.type} onValueChange={(value) => setNewTemplate({...newTemplate, type: value})}>
                  <SelectTrigger id="template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Input
                id="industry"
                value={newTemplate.industry}
                onChange={(e) => setNewTemplate({...newTemplate, industry: e.target.value})}
                placeholder="e.g., Technology, Healthcare, Finance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header">Header Section</Label>
              <Textarea
                id="header"
                value={newTemplate.header}
                onChange={(e) => setNewTemplate({...newTemplate, header: e.target.value})}
                placeholder="Your contact information format..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening">Opening Paragraph</Label>
              <Textarea
                id="opening"
                value={newTemplate.opening}
                onChange={(e) => setNewTemplate({...newTemplate, opening: e.target.value})}
                placeholder="Template for opening paragraph..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body1">Body Paragraph 1</Label>
              <Textarea
                id="body1"
                value={newTemplate.body1}
                onChange={(e) => setNewTemplate({...newTemplate, body1: e.target.value})}
                placeholder="First body paragraph template..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body2">Body Paragraph 2</Label>
              <Textarea
                id="body2"
                value={newTemplate.body2}
                onChange={(e) => setNewTemplate({...newTemplate, body2: e.target.value})}
                placeholder="Second body paragraph template..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closing">Closing Paragraph</Label>
              <Textarea
                id="closing"
                value={newTemplate.closing}
                onChange={(e) => setNewTemplate({...newTemplate, closing: e.target.value})}
                placeholder="Template for closing paragraph..."
                rows={2}
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Customization Options
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color-theme">Color Theme</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        id="color-theme"
                        type="color"
                        value={newTemplate.colorTheme}
                        onChange={(e) => setNewTemplate({...newTemplate, colorTheme: e.target.value})}
                        className="h-10 w-20 cursor-pointer"
                      />
                      <Input
                        value={newTemplate.colorTheme}
                        onChange={(e) => setNewTemplate({...newTemplate, colorTheme: e.target.value})}
                        placeholder="#3B82F6"
                        className="flex-1 font-mono"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTemplate({...newTemplate, colorTheme: color})}
                          className="w-8 h-8 rounded-md border-2 hover:scale-110 transition-transform"
                          style={{ 
                            backgroundColor: color,
                            borderColor: newTemplate.colorTheme === color ? '#000' : 'transparent'
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select value={newTemplate.fontSize} onValueChange={(value) => setNewTemplate({...newTemplate, fontSize: value})}>
                    <SelectTrigger id="font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10pt (Compact)</SelectItem>
                      <SelectItem value="11">11pt (Standard)</SelectItem>
                      <SelectItem value="12">12pt (Comfortable)</SelectItem>
                      <SelectItem value="14">14pt (Large)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select value={newTemplate.fontFamily} onValueChange={(value) => setNewTemplate({...newTemplate, fontFamily: value})}>
                    <SelectTrigger id="font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Times New Roman">Times New Roman (Classic)</SelectItem>
                      <SelectItem value="Arial">Arial (Modern)</SelectItem>
                      <SelectItem value="Calibri">Calibri (Professional)</SelectItem>
                      <SelectItem value="Georgia">Georgia (Elegant)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-spacing">Line Spacing</Label>
                  <Select value={newTemplate.lineSpacing} onValueChange={(value) => setNewTemplate({...newTemplate, lineSpacing: value})}>
                    <SelectTrigger id="line-spacing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.0">Single (Compact)</SelectItem>
                      <SelectItem value="1.5">1.5 (Standard)</SelectItem>
                      <SelectItem value="2.0">Double (Spacious)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize Template Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Template</DialogTitle>
            <DialogDescription>
              Adjust colors, fonts, and styling for {selectedTemplateForAction?.template_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-color">Color Theme</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="custom-color"
                    type="color"
                    value={newTemplate.colorTheme}
                    onChange={(e) => setNewTemplate({...newTemplate, colorTheme: e.target.value})}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <Input
                    value={newTemplate.colorTheme}
                    onChange={(e) => setNewTemplate({...newTemplate, colorTheme: e.target.value})}
                    placeholder="#3B82F6"
                    className="flex-1 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  {['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTemplate({...newTemplate, colorTheme: color})}
                      className="w-8 h-8 rounded-md border-2 hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: color,
                        borderColor: newTemplate.colorTheme === color ? '#000' : 'transparent'
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-font-size">Font Size</Label>
              <Select value={newTemplate.fontSize} onValueChange={(value) => setNewTemplate({...newTemplate, fontSize: value})}>
                <SelectTrigger id="custom-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10pt (Compact)</SelectItem>
                  <SelectItem value="11">11pt (Standard)</SelectItem>
                  <SelectItem value="12">12pt (Comfortable)</SelectItem>
                  <SelectItem value="14">14pt (Large)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-font-family">Font Family</Label>
              <Select value={newTemplate.fontFamily} onValueChange={(value) => setNewTemplate({...newTemplate, fontFamily: value})}>
                <SelectTrigger id="custom-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times New Roman">Times New Roman (Classic)</SelectItem>
                  <SelectItem value="Arial">Arial (Modern)</SelectItem>
                  <SelectItem value="Calibri">Calibri (Professional)</SelectItem>
                  <SelectItem value="Georgia">Georgia (Elegant)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-line-spacing">Line Spacing</Label>
              <Select value={newTemplate.lineSpacing} onValueChange={(value) => setNewTemplate({...newTemplate, lineSpacing: value})}>
                <SelectTrigger id="custom-line-spacing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">Single (Compact)</SelectItem>
                  <SelectItem value="1.5">1.5 (Standard)</SelectItem>
                  <SelectItem value="2.0">Double (Spacious)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="text-xs font-semibold mb-2">Preview</div>
              <div 
                className="h-32 rounded border-2 p-4 transition-all"
                style={{ 
                  borderColor: newTemplate.colorTheme,
                  fontFamily: newTemplate.fontFamily,
                  fontSize: `${newTemplate.fontSize}pt`,
                  lineHeight: newTemplate.lineSpacing
                }}
              >
                <div style={{ color: newTemplate.colorTheme }} className="font-bold mb-2">
                  Your Name
                </div>
                <div className="text-sm text-muted-foreground">
                  This is how your cover letter will look with the selected customization options.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCustomizeTemplate}>
              <Palette className="h-4 w-4 mr-2" />
              Save Customization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Template Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Custom Template</DialogTitle>
            <DialogDescription>
              Upload a template file (JSON or TXT) to add to your library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="template-file" className="cursor-pointer">
                <div className="text-sm font-medium mb-2">Click to upload template</div>
                <div className="text-xs text-muted-foreground mb-4">JSON or TXT format</div>
              </Label>
              <Input
                id="template-file"
                type="file"
                accept=".json,.txt"
                onChange={handleImportTemplate}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('template-file')?.click()}
              >
                Select File
              </Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-xs">
              <div className="font-semibold mb-2">File Format Requirements:</div>
              <div>• <strong>JSON:</strong> Must include template_name and content_structure fields</div>
              <div>• <strong>TXT:</strong> Separate sections with double line breaks (header, opening, body paragraphs, closing)</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Template Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Template</DialogTitle>
            <DialogDescription>
              Make this template available to other users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm mb-3">
                Sharing this template will make it publicly visible in the template library.
              </p>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/cover-letters?templateId=${selectedTemplateForAction?.id}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyShareLink} variant="outline" size="icon">
                  {copiedShareLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleShareTemplate}>
              <Share2 className="h-4 w-4 mr-2" />
              Make Public
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Template Analytics</DialogTitle>
            <DialogDescription>
              View usage statistics and performance metrics for your templates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{templates.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {templates.filter(t => !t.is_system_template).length} custom
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {templates.reduce((sum, t) => sum + t.usage_count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all templates</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Most Used Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates
                    .sort((a, b) => b.usage_count - a.usage_count)
                    .slice(0, 5)
                    .map((template, index) => (
                      <div key={template.id} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{template.template_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{template.template_type}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold">{template.usage_count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Template Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    templates.reduce((acc, t) => {
                      acc[t.template_type] = (acc[t.template_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{type}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(count / templates.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}