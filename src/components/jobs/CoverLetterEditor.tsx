import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, TrendingUp, Sparkles, ChevronDown, Loader2, Lightbulb, Copy, Edit, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CoverLetterEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onContentChange?: (content: string) => void;
  jobTitle?: string;
  jobId?: string;
  templateType?: string;
  autoGenerate?: boolean;
  globalTextSize?: string;
}

export function CoverLetterEditor({ initialContent, onSave, onContentChange, jobTitle, jobId, templateType = 'formal', autoGenerate = false, globalTextSize = 'medium' }: CoverLetterEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readabilityScore, setReadabilityScore] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  
  // AI Generation states
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState(templateType);
  const [tone, setTone] = useState('formal');
  const [length, setLength] = useState('standard');
  const [style, setStyle] = useState('direct');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(jobId || '');
  const [companyResearch, setCompanyResearch] = useState<any>(null);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [showCompanyResearch, setShowCompanyResearch] = useState(false);
  
  // Writing assistance features
  const [selectedText, setSelectedText] = useState('');
  const [synonymSuggestions, setSynonymSuggestions] = useState<string[]>([]);
  const [showSynonyms, setShowSynonyms] = useState(false);
  const [restructuringSuggestions, setRestructuringSuggestions] = useState<any[]>([]);
  const [showRestructuring, setShowRestructuring] = useState(false);
  const [sentenceCount, setSentenceCount] = useState(0);
  const [paragraphCount, setParagraphCount] = useState(0);
  const [avgSentenceLength, setAvgSentenceLength] = useState(0);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Font customization
  const [fontSize, setFontSize] = useState('12');
  const [fontFamily, setFontFamily] = useState("'Times New Roman', serif");

  // Get document font size based on global text size setting
  const getDocumentFontSize = () => {
    switch (globalTextSize) {
      case 'small':
        return '11';
      case 'large':
        return '14';
      case 'medium':
      default:
        return '12';
    }
  };

  useEffect(() => {
    // Only update content if initialContent is different from what we have
    // and it's different from what user is currently editing
    if (initialContent !== content && initialContent !== lastSavedContent) {
      setContent(initialContent);
      setLastSavedContent(initialContent);
      setHasChanges(false);
    }
  }, [initialContent]);

  useEffect(() => {
    fetchUserProfile();
    fetchJobs();
    if (jobId) {
      setSelectedJobId(jobId);
      fetchJob(jobId);
    }
  }, [jobId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchJob(selectedJobId);
    }
  }, [selectedJobId]);

  useEffect(() => {
    // Auto-trigger AI generation if requested and all data is ready
    if (autoGenerate && userProfile && job && job.job_description && job.job_description.trim() !== '' && !aiGenerating && content === initialContent) {
      setIsAIOpen(true);
      handleAIGenerate();
    } else if (autoGenerate && job && (!job.job_description || job.job_description.trim() === '')) {
      // Show helpful message if trying to auto-generate but job description is missing
      toast.error('Cannot generate AI cover letter: This job needs a description. Please add one in the job details first.');
      setIsAIOpen(true);
    }
  }, [autoGenerate, userProfile, job, aiGenerating, initialContent]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: employment } = await supabase
        .from('employment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id);

      const { data: education } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('graduation_date', { ascending: false });

      setUserProfile({
        ...profile,
        employment_history: employment,
        skills,
        education
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchJob = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
      
      // Fetch company research if available
      await fetchCompanyResearch(id);
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  };

  const fetchCompanyResearch = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_research')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCompanyResearch(data);
      }
    } catch (error) {
      console.error('Error fetching company research:', error);
    }
  };

  const handleAIGenerate = async () => {
    if (!userProfile) {
      toast.error('Please complete your profile first');
      return;
    }

    if (!job) {
      toast.error('Job information is required for AI generation');
      return;
    }

    if (!job.job_description || job.job_description.trim() === '') {
      toast.error('This job needs a description for AI generation. Please add one in the job details first.');
      return;
    }

    setAiGenerating(true);
    try {
      // Auto-generate company research if not available
      let researchData = companyResearch;
      if (!researchData && selectedJobId) {
        toast.info('Researching company first...');
        const { data: research } = await supabase.functions.invoke('generate-company-research', {
          body: { jobId: selectedJobId }
        });
        
        if (research?.research) {
          researchData = research.research;
          setCompanyResearch(researchData);
        }
      }

      // Prepare company research data if available
      const companyResearchData = researchData ? {
        profile: researchData.company_profile,
        leadership: researchData.leadership_info,
        marketPosition: researchData.market_position,
        recentNews: researchData.recent_news,
        competitiveLandscape: researchData.competitive_landscape,
        talkingPoints: researchData.talking_points
      } : null;

      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          jobDescription: job.job_description,
          userProfile,
          companyInfo: {
            company_name: job.company_name,
            company_description: job.company_description,
            company_website: job.company_website,
            job_title: job.job_title,
            industry: job.industry,
            company_size: job.company_size
          },
          companyResearch: companyResearchData,
          templateType: selectedTemplateType,
          tonePreferences: {
            tone,
            length,
            style
          },
          readabilityRequirements: {
            targetScore: '50-70',
            maxSentenceLength: 22,
            averageSentenceLength: '15-18',
            preferActiveVoice: true,
            avoidJargon: true,
            instruction: 'CRITICAL READABILITY REQUIREMENTS: Generate content that scores 50-70 on the Flesch Reading Ease scale (Standard to Fairly Easy). This means: (1) Keep sentences short and crisp - average 15-18 words, maximum 22 words per sentence. (2) Use clear, professional vocabulary - avoid unnecessarily complex words. (3) Prefer active voice: "I managed the team" not "The team was managed by me". (4) Break complex ideas into multiple sentences. (5) Use simple sentence structures. The goal is professional but HIGHLY READABLE text that hiring managers can scan quickly. Test readability: most sentences should feel like natural speech when read aloud.'
          },
          lengthRequirements: {
            pageLimit: 1,
            targetWordCount: '350-400',
            maxWordCount: 450,
            minWordCount: 300,
            instruction: 'MANDATORY: The cover letter MUST fit on exactly one page when printed (8.5" x 11" with 1" margins, 11-12pt font). Target 350-400 words total. Structure: Brief opening paragraph (50-75 words), two body paragraphs (100-125 words each), and closing paragraph (50-75 words). Be concise and impactful - every word must count. Do not exceed 450 words under any circumstances.'
          }
        }
      });

      if (error) throw error;

      if (data?.variations && data.variations.length > 0) {
        setGeneratedData(data); // Store full response data
        const firstVariation = data.variations[0];
        const header = firstVariation.header || '';
        const generatedText = header 
          ? `${header}\n\n${firstVariation.opening}\n\n${firstVariation.body1}\n\n${firstVariation.body2}\n\n${firstVariation.closing}`
          : `${firstVariation.opening}\n\n${firstVariation.body1}\n\n${firstVariation.body2}\n\n${firstVariation.closing}`;
        setContent(generatedText);
        setHasChanges(true);
        toast.success('Cover letter generated successfully!');
        setShowAIInsights(true);
        // Keep AI section open to show experience highlighting
      }
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      toast.error(error.message || 'Failed to generate cover letter');
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    // Update counts and readability when content changes
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = content.length;
    setWordCount(words);
    setCharCount(chars);
    
    // Calculate readability score (Flesch Reading Ease approximation)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    
    setSentenceCount(sentences);
    setParagraphCount(paragraphs);
    
    if (words > 0 && sentences > 0) {
      const syllables = estimateSyllables(content);
      const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
      setReadabilityScore(Math.max(0, Math.min(100, Math.round(score))));
      setAvgSentenceLength(Math.round(words / sentences));
    }
  }, [content]);

  useEffect(() => {
    // Auto-save after 15 seconds of inactivity
    if (!hasChanges || !content.trim()) return;
    
    const timer = setTimeout(() => {
      try {
        onSave(content);
        setHasChanges(false);
        setLastSavedContent(content);
        toast.success('✓ Auto-saved', { duration: 2000 });
      } catch (error) {
        console.error('Auto-save error:', error);
        toast.error('Auto-save failed. Please save manually.');
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [content, hasChanges, onSave]);

  const estimateSyllables = (text: string): number => {
    // Improved syllable estimation algorithm
    const lowerText = text.toLowerCase();
    const matches = lowerText.match(/\b[a-z]+\b/g);
    const words: string[] = matches || [];
    
    return words.reduce((count: number, word: string) => {
      if (word.length <= 3) return count + 1; // Short words are usually 1 syllable
      
      // Count vowel groups, but handle common patterns
      let syllables = 0;
      let previousWasVowel = false;
      
      for (let i = 0; i < word.length; i++) {
        const isVowel = /[aeiouy]/.test(word[i]);
        
        if (isVowel && !previousWasVowel) {
          syllables++;
        }
        previousWasVowel = isVowel;
      }
      
      // Adjust for common patterns
      if (word.endsWith('e')) syllables--; // Silent e
      if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) syllables++; // -ble, -ple, etc.
      if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded')) {
        if (syllables > 1) syllables--; // Most -ed endings don't add syllables
      }
      
      // Ensure at least 1 syllable per word
      return count + Math.max(1, syllables);
    }, 0);
  };

  const getReadabilityLabel = (score: number): { label: string; color: string; explanation: string; suggestions: string[] } => {
    if (score >= 90) return { 
      label: 'Very Easy', 
      color: 'bg-green-500',
      explanation: 'Your text is very easy to read, but may be too simple for a professional cover letter. Consider adding more sophisticated language.',
      suggestions: [
        'Add industry-specific terminology where appropriate',
        'Use more varied vocabulary to demonstrate expertise',
        'Include specific examples and achievements'
      ]
    };
    if (score >= 80) return { 
      label: 'Easy', 
      color: 'bg-green-400',
      explanation: 'Your text is easy to read and accessible. Good for most audiences, though you might want to add some professional polish.',
      suggestions: [
        'Consider adding 1-2 more complex sentences to show depth',
        'Include specific metrics or technical terms if relevant',
        'Ensure you\'re demonstrating expertise clearly'
      ]
    };
    if (score >= 70) return { 
      label: 'Fairly Easy', 
      color: 'bg-green-500',
      explanation: 'Your text strikes a good balance between accessibility and professionalism. This is ideal for most cover letters.',
      suggestions: [
        'Maintain this balance throughout your letter',
        'Ensure key points are clearly stated',
        'Use concrete examples to support claims'
      ]
    };
    if (score >= 50) return { 
      label: 'Standard', 
      color: 'bg-green-500',
      explanation: 'Your text has standard professional readability. Perfect for cover letters - sophisticated but still clear.',
      suggestions: [
        'This is an excellent readability level for cover letters',
        'Make sure technical terms are necessary and well-explained',
        'Keep this level consistent throughout'
      ]
    };
    if (score >= 30) return { 
      label: 'Fairly Difficult', 
      color: 'bg-yellow-500',
      explanation: 'Your text is getting complex. Consider simplifying to ensure hiring managers can quickly grasp your key points.',
      suggestions: [
        'Break up long sentences (aim for 15-20 words per sentence)',
        'Replace complex words with simpler alternatives where possible',
        'Use more active voice instead of passive constructions',
        'Review sentences over 25 words for simplification'
      ]
    };
    return { 
      label: 'Difficult', 
      color: 'bg-orange-500',
      explanation: 'Your text is difficult to read. Very long sentences and complex vocabulary may obscure your message.',
      suggestions: [
        'Significantly shorten sentences - most are likely over 30 words',
        'Simplify vocabulary and remove unnecessary jargon',
        'Split long sentences into 2-3 shorter ones',
        'Use clear, direct language to state achievements',
        'Consider using the restructuring suggestions tool'
      ]
    };
  };

  const handleTextSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const selected = target.value.substring(target.selectionStart, target.selectionEnd).trim();
    if (selected && selected.split(/\s+/).length <= 3) {
      setSelectedText(selected);
    } else {
      setSelectedText('');
      setShowSynonyms(false);
    }
  };

  const getSynonymSuggestions = async (word: string) => {
    if (!word || word.split(/\s+/).length > 1) return;
    
    setIsLoadingSuggestions(true);
    try {
      // Predefined synonym database for common words
      const synonyms: Record<string, string[]> = {
        'good': ['excellent', 'outstanding', 'exceptional', 'superior', 'remarkable'],
        'great': ['exceptional', 'outstanding', 'excellent', 'impressive', 'superb'],
        'important': ['crucial', 'vital', 'essential', 'critical', 'significant'],
        'help': ['assist', 'support', 'aid', 'facilitate', 'contribute'],
        'work': ['collaborate', 'contribute', 'operate', 'execute', 'deliver'],
        'make': ['create', 'develop', 'establish', 'build', 'construct'],
        'get': ['obtain', 'acquire', 'secure', 'achieve', 'attain'],
        'show': ['demonstrate', 'exhibit', 'display', 'illustrate', 'reveal'],
        'use': ['utilize', 'employ', 'leverage', 'apply', 'implement'],
        'lead': ['direct', 'guide', 'manage', 'spearhead', 'orchestrate'],
        'improve': ['enhance', 'optimize', 'refine', 'strengthen', 'elevate'],
        'increase': ['boost', 'elevate', 'amplify', 'expand', 'augment'],
        'achieve': ['accomplish', 'attain', 'realize', 'complete', 'secure'],
        'manage': ['oversee', 'coordinate', 'direct', 'administer', 'supervise'],
        'develop': ['create', 'build', 'establish', 'design', 'formulate'],
        'ensure': ['guarantee', 'secure', 'confirm', 'verify', 'establish'],
        'provide': ['deliver', 'supply', 'offer', 'furnish', 'present'],
        'support': ['assist', 'facilitate', 'enable', 'bolster', 'reinforce'],
        'enhance': ['improve', 'strengthen', 'elevate', 'refine', 'optimize'],
        'passionate': ['enthusiastic', 'dedicated', 'committed', 'devoted', 'zealous'],
        'excited': ['enthusiastic', 'eager', 'thrilled', 'motivated', 'energized']
      };
      
      const lowerWord = word.toLowerCase();
      const suggestions = synonyms[lowerWord] || [];
      setSynonymSuggestions(suggestions);
      setShowSynonyms(suggestions.length > 0);
    } catch (error) {
      console.error('Error getting synonyms:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applySynonym = (synonym: string) => {
    if (!selectedText) return;
    const newContent = content.replace(selectedText, synonym);
    setContent(newContent);
    setHasChanges(true);
    setShowSynonyms(false);
    if (onContentChange) {
      onContentChange(newContent);
    }
    toast.success('Synonym applied');
  };

  const getRestructuringSuggestions = () => {
    const suggestions: any[] = [];
    
    // Split content into lines to identify header section
    const lines = content.split('\n');
    let contentStartIndex = 0;
    
    // Detect header section - typically first few lines with contact info, dates, addresses
    // Look for common header patterns: name, address, phone, email, date
    const headerPatterns = [
      /^\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|court|ct|boulevard|blvd)/i,
      /^\w+,\s*[A-Z]{2}\s+\d{5}/i, // City, State ZIP
      /^[\w._%+-]+@[\w.-]+\.[A-Z]{2,}$/i, // Email
      /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/i, // Phone
      /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i, // Date
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // Date format
      /^dear\s+(?:hiring\s+manager|sir|madam|mr\.|ms\.|mrs\.|dr\.)/i // Salutation
    ];
    
    // Find where actual letter content starts (after header/salutation)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      // If line matches header pattern, skip it
      const isHeaderLine = headerPatterns.some(pattern => pattern.test(line));
      if (!isHeaderLine && line.length > 20) {
        // Found start of actual content (not header info)
        contentStartIndex = i;
        break;
      }
    }
    
    // Join lines from content start onwards for analysis
    const actualContent = lines.slice(contentStartIndex).join('\n');
    const sentences = actualContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check if header is complete and add suggestion if missing critical elements
    const headerSection = lines.slice(0, Math.max(10, contentStartIndex)).join('\n');
    const hasName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(headerSection);
    const hasEmail = /[\w._%+-]+@[\w.-]+\.[A-Z]{2,}/i.test(headerSection);
    const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(headerSection);
    const hasAddress = headerPatterns[0].test(headerSection) || headerPatterns[1].test(headerSection);
    
    const missingElements = [];
    if (!hasName) missingElements.push('your name');
    if (!hasEmail) missingElements.push('email address');
    if (!hasPhone) missingElements.push('phone number');
    if (!hasAddress) missingElements.push('mailing address');
    
    if (missingElements.length > 0) {
      suggestions.push({
        type: 'header',
        severity: 'info',
        original: 'Header Section',
        message: `Your header appears to be missing: ${missingElements.join(', ')}. Professional cover letters should include complete contact information.`,
        suggestion: `Add your ${missingElements.join(', ')} at the top of the letter before the salutation.`
      });
    }
    
    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      
      // Skip very short sentences that might be headers/dates
      if (words.length <= 2) return;
      
      // Too long sentences
      if (words.length > 30) {
        suggestions.push({
          type: 'length',
          severity: 'warning',
          original: sentence.trim(),
          message: `A sentence in your letter is very long (${words.length} words). Consider breaking it into 2-3 shorter sentences for better clarity.`,
          suggestion: 'Break this into shorter sentences using periods or semicolons.'
        });
      }
      
      // Too short sentences (but not single/two word headers)
      if (words.length >= 3 && words.length < 5) {
        suggestions.push({
          type: 'length',
          severity: 'info',
          original: sentence.trim(),
          message: `A sentence in your letter is quite short (${words.length} words). Consider combining with adjacent sentences or adding more detail.`,
          suggestion: 'Combine with nearby sentences or expand with more specific details.'
        });
      }
      
      // Passive voice detection
      if (/\b(was|were|is|are|been|being)\s+\w+ed\b/i.test(sentence)) {
        suggestions.push({
          type: 'voice',
          severity: 'suggestion',
          original: sentence.trim(),
          message: `This sentence may contain passive voice. Active voice is often stronger in cover letters.`,
          suggestion: 'Rewrite using active voice (e.g., "I developed" instead of "was developed by me").'
        });
      }
    });
    
    setRestructuringSuggestions(suggestions);
    setShowRestructuring(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasChanges(true);
    
    // Real-time sync to parent for export
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const handleSave = () => {
    onSave(content);
    setHasChanges(false);
    setLastSavedContent(content);
    toast.success('Cover letter saved');
  };

  const readability = readabilityScore !== null ? getReadabilityLabel(readabilityScore) : null;

  return (
    <>
    <div className="flex flex-col xl:flex-row gap-1 sm:gap-2 lg:gap-3 xl:gap-4 h-full w-full max-w-full overflow-hidden">
      {/* Editor Section */}
      <div className="w-full xl:w-1/2 space-y-1 sm:space-y-2 lg:space-y-3 min-w-0 max-w-full flex flex-col overflow-hidden">
        {/* AI Generator Collapsible */}
        <Collapsible open={isAIOpen} onOpenChange={setIsAIOpen}>
          <Card className="border-2 border-primary/20 flex-shrink-0">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-1 sm:py-2 lg:py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                    <div className="p-1 sm:p-1.5 lg:p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-sm sm:text-base lg:text-lg">AI Cover Letter Generator</CardTitle>
                      <CardDescription className="text-xs sm:text-sm hidden sm:block">
                        Generate personalized content with AI
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform duration-200 ${
                    isAIOpen ? 'rotate-180' : ''
                  }`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="templateType" className="text-xs sm:text-sm">Cover Letter Type</Label>
                  <Select value={selectedTemplateType} onValueChange={setSelectedTemplateType}>
                    <SelectTrigger id="templateType">
                      <SelectValue placeholder="Select cover letter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal - Professional, traditional business language</SelectItem>
                      <SelectItem value="creative">Creative - Engaging with compelling hook or story</SelectItem>
                      <SelectItem value="technical">Technical - Precise technical language and methodologies</SelectItem>
                      <SelectItem value="sales">Sales - Results-driven, emphasizing metrics and impact</SelectItem>
                      <SelectItem value="academic">Academic - Scholarly, emphasizing research and teaching</SelectItem>
                      <SelectItem value="startup">Startup - Energetic, mission-driven, adaptable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobSelect">Select Job Posting</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger id="jobSelect">
                      <SelectValue placeholder="Choose a job to tailor your cover letter for" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((jobItem) => (
                        <SelectItem key={jobItem.id} value={jobItem.id}>
                          {jobItem.job_title} at {jobItem.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="analytical">Analytical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="length">Length (All fit 1 page)</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger id="length">
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">Concise (~300 words)</SelectItem>
                        <SelectItem value="standard">Standard (~375 words)</SelectItem>
                        <SelectItem value="detailed">Comprehensive (~425 words)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">All options fit on one page</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="style">Writing Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger id="style">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="narrative">Narrative</SelectItem>
                        <SelectItem value="bullet">Bullet Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !selectedJobId}
                  className="w-full"
                  size="lg"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>

                {!selectedJobId && (
                  <p className="text-sm text-muted-foreground text-center">
                  Please select a job posting to generate a tailored cover letter
                </p>
              )}

              {/* Company Research Button */}
              {selectedJobId && (
                <Button
                  onClick={async () => {
                    setIsGeneratingResearch(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-company-research', {
                        body: { jobId: selectedJobId }
                      });
                      
                      if (error) throw error;
                      
                      if (data?.research) {
                        setCompanyResearch(data.research);
                        setShowCompanyResearch(true);
                        toast.success('Company research generated!');
                      }
                    } catch (error: any) {
                      console.error('Error generating research:', error);
                      toast.error(error.message || 'Failed to generate company research');
                    } finally {
                      setIsGeneratingResearch(false);
                    }
                  }}
                  variant="outline"
                  disabled={isGeneratingResearch}
                  className="w-full"
                >
                  {isGeneratingResearch ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching Company...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      {companyResearch ? 'Refresh Company Research' : 'Generate Company Research'}
                    </>
                  )}
                </Button>
              )}

              {/* Company Research Display */}
              {companyResearch && showCompanyResearch && (
                <Collapsible open={showCompanyResearch} onOpenChange={setShowCompanyResearch}>
                  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-base">Company Research</CardTitle>
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${showCompanyResearch ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {/* Company Profile */}
                        {companyResearch.company_profile && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Badge variant="outline">Profile</Badge>
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {companyResearch.company_profile.summary}
                            </p>
                            {companyResearch.company_profile.mission && (
                              <div className="pl-3 border-l-2 border-blue-300">
                                <p className="text-xs font-medium">Mission:</p>
                                <p className="text-xs text-muted-foreground">{companyResearch.company_profile.mission}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Market Position */}
                        {companyResearch.market_position && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Badge variant="outline">Market Position</Badge>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-medium">Standing:</span> {companyResearch.market_position.market_standing}
                              </div>
                              <div>
                                <span className="font-medium">Stage:</span> {companyResearch.market_position.growth_stage}
                              </div>
                            </div>
                            {companyResearch.market_position.competitive_advantages && (
                              <div>
                                <p className="text-xs font-medium mb-1">Key Advantages:</p>
                                <ul className="text-xs space-y-1">
                                  {companyResearch.market_position.competitive_advantages.slice(0, 3).map((adv: string, i: number) => (
                                    <li key={i} className="pl-3">• {adv}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recent News */}
                        {companyResearch.recent_news && companyResearch.recent_news.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Badge variant="outline">Recent News</Badge>
                            </h4>
                            <div className="space-y-2">
                              {companyResearch.recent_news.slice(0, 3).map((news: any, i: number) => (
                                <div key={i} className="p-2 rounded bg-background/50 border text-xs">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="font-medium">{news.title}</span>
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      {news.category?.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground">{news.summary}</p>
                                  {news.key_points && news.key_points.length > 0 && (
                                    <ul className="mt-1 space-y-0.5">
                                      {news.key_points.slice(0, 2).map((point: string, j: number) => (
                                        <li key={j} className="text-muted-foreground pl-2">→ {point}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Talking Points */}
                        {companyResearch.talking_points && companyResearch.talking_points.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Badge variant="outline">Key Talking Points</Badge>
                            </h4>
                            <ul className="text-xs space-y-1">
                              {companyResearch.talking_points.slice(0, 4).map((point: string, i: number) => (
                                <li key={i} className="pl-3">✓ {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground italic">
                          This research will be automatically included in your cover letter generation.
                        </p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

                {/* UC-059: Experience Highlighting Display */}
                {generatedData?.variations?.[0]?.highlightedExperiences && generatedData.variations[0].highlightedExperiences.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Highlighted Experiences (Relevance Analysis)
                      </h3>
                      <div className="space-y-3">
                        {generatedData.variations[0].highlightedExperiences.map((exp: any, i: number) => (
                          <div key={i} className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{exp.experience}</div>
                              <Badge variant={exp.relevanceScore >= 80 ? 'default' : 'secondary'}>
                                {exp.relevanceScore}% Match
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">{exp.narrative}</div>
                            <div className="space-y-1">
                              {(exp.keyAchievements || []).map((achievement: string, j: number) => (
                                <div key={j} className="text-sm flex gap-2">
                                  <span className="text-primary">✓</span>
                                  <span>{achievement}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Generated Variations Selector */}
                {generatedData?.variations && generatedData.variations.length > 1 && (
                  <div className="mt-4">
                    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          AI Generated {generatedData.variations.length} Variations - Try Different Versions
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Click any variation below to load it into the editor
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {generatedData.variations.map((variation: any, index: number) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={() => {
                              const header = variation.header || '';
                              const text = header 
                                ? `${header}\n\n${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`
                                : `${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`;
                              setContent(text);
                              setHasChanges(true);
                              if (onContentChange) {
                                onContentChange(text);
                              }
                              toast.success(`Loaded Variation ${index + 1}`);
                            }}
                          >
                            <div className="flex flex-col gap-2 w-full min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  Variation {index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize shrink-0">
                                  {variation.tone || 'Professional'} tone
                                </span>
                                {variation.keyStrengths && variation.keyStrengths.length > 0 && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    • {variation.keyStrengths.slice(0, 2).join(', ')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-3 break-words">
                                {variation.opening.substring(0, 150)}...
                              </div>
                            </div>
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAIInsights(true)}
                          className="w-full text-xs"
                        >
                          View Full Details & Company Research
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Experience Analysis */}
                {generatedData?.experienceAnalysis && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                    <h3 className="font-semibold text-sm">Experience Analysis</h3>
                    {generatedData.experienceAnalysis.topMatches?.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-1">Top Matching Experiences</div>
                        <ul className="space-y-2 text-sm">
                          {generatedData.experienceAnalysis.topMatches.map((match: any, i: number) => (
                            <li key={i} className="p-2 bg-background rounded">
                              <div className="flex gap-2 items-start">
                                <span className="text-primary">★</span>
                                <div>
                                  <span className="font-medium">{typeof match === 'string' ? match : match.experience}</span>
                                  {match.reason && <p className="text-muted-foreground text-xs mt-1">{match.reason}</p>}
                                  {match.score && <span className="text-xs text-primary ml-2">({match.score}% match)</span>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedData.experienceAnalysis.suggestedAdditions?.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-1">Additional Relevant Experiences</div>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {generatedData.experienceAnalysis.suggestedAdditions.map((add: any, i: number) => (
                            <li key={i} className="flex gap-2">
                              <span>+</span>
                              <span>{typeof add === 'string' ? add : add.experience || add.reason || JSON.stringify(add)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* UC-057: Company Research Integration Display */}
                {companyResearch && generatedData && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <Lightbulb className="h-4 w-4" />
                      Company Research Integrated Into Cover Letter
                    </h3>
                    
                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList className="flex flex-wrap w-full h-auto gap-1">
                        <TabsTrigger value="summary" className="text-xs flex-1 min-w-[70px]">Summary</TabsTrigger>
                        <TabsTrigger value="news" className="text-xs flex-1 min-w-[70px]">News Referenced</TabsTrigger>
                        <TabsTrigger value="values" className="text-xs flex-1 min-w-[70px]">Values Alignment</TabsTrigger>
                        <TabsTrigger value="market" className="text-xs flex-1 min-w-[70px]">Market Position</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="summary" className="space-y-3 pt-4">
                        <div className="text-xs space-y-2.5">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">Company background and history referenced</span>
                          </div>
                          {companyResearch.company_profile?.mission && (
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">Mission statement alignment demonstrated</span>
                            </div>
                          )}
                          {companyResearch.recent_news && companyResearch.recent_news.length > 0 && (
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{companyResearch.recent_news.length} recent news items incorporated</span>
                            </div>
                          )}
                          {companyResearch.market_position && (
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">Industry context and market position acknowledged</span>
                            </div>
                          )}
                          {companyResearch.competitive_landscape && (
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">Competitive landscape awareness shown</span>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="news" className="space-y-3 pt-4">
                        {companyResearch.recent_news && companyResearch.recent_news.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              These recent developments were referenced in your cover letter:
                            </p>
                            {companyResearch.recent_news.slice(0, 3).map((news: any, i: number) => (
                              <div key={i} className="p-3 bg-background/50 rounded border text-xs space-y-2">
                                <div className="font-medium flex items-start justify-between gap-3">
                                  <span className="flex-1 leading-relaxed">{news.title}</span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {news.category?.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">{news.summary}</p>
                                {news.source && (
                                  <p className="text-muted-foreground text-[10px] leading-relaxed">Source: {news.source}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground leading-relaxed">No recent news was available for this company.</p>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="values" className="space-y-3 pt-4">
                        {companyResearch.company_profile?.mission && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium">Company Mission:</div>
                            <p className="text-xs text-muted-foreground p-3 bg-background/50 rounded border leading-relaxed">
                              {companyResearch.company_profile.mission}
                            </p>
                          </div>
                        )}
                        {companyResearch.company_profile?.values && companyResearch.company_profile.values.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium">Core Values Referenced:</div>
                            <div className="flex flex-wrap gap-2">
                              {companyResearch.company_profile.values.map((value: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] py-1">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {companyResearch.talking_points && companyResearch.talking_points.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium">Key Talking Points Used:</div>
                            <ul className="text-xs space-y-2">
                              {companyResearch.talking_points.slice(0, 3).map((point: string, i: number) => (
                                <li key={i} className="pl-4 text-muted-foreground leading-relaxed">• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="market" className="space-y-3 pt-4">
                        {companyResearch.market_position ? (
                          <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-background/50 rounded border space-y-1.5">
                                <div className="font-medium">Market Standing</div>
                                <div className="text-muted-foreground leading-relaxed">{companyResearch.market_position.market_standing}</div>
                              </div>
                              <div className="p-3 bg-background/50 rounded border space-y-1.5">
                                <div className="font-medium">Growth Stage</div>
                                <div className="text-muted-foreground leading-relaxed">{companyResearch.market_position.growth_stage}</div>
                              </div>
                            </div>
                            {companyResearch.market_position.competitive_advantages && (
                              <div className="space-y-2">
                                <div className="font-medium">Competitive Advantages:</div>
                                <ul className="space-y-2 text-muted-foreground">
                                  {companyResearch.market_position.competitive_advantages.slice(0, 3).map((adv: string, i: number) => (
                                    <li key={i} className="pl-4 leading-relaxed">+ {adv}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {companyResearch.market_position.differentiators && (
                              <div className="space-y-2">
                                <div className="font-medium">Key Differentiators:</div>
                                <ul className="space-y-2 text-muted-foreground">
                                  {companyResearch.market_position.differentiators.map((diff: string, i: number) => (
                                    <li key={i} className="pl-4 leading-relaxed">⭐ {diff}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground leading-relaxed">Market position data not available.</p>
                        )}
                      </TabsContent>
                    </Tabs>

                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-[11px] text-muted-foreground italic">
                        ✓ All this research has been thoughtfully integrated into your cover letter to demonstrate genuine interest and research depth.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Editor Card */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Cover Letter</CardTitle>
              <CardDescription>
                Refine and personalize your cover letter
                {jobTitle && ` for ${jobTitle}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Font Customization Controls */}
          <div className="flex gap-4 items-center p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Label htmlFor="font-family" className="text-sm font-medium whitespace-nowrap">Font:</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger id="font-family" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Garamond', serif">Garamond</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="'Calibri', sans-serif">Calibri</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Textarea
            value={content}
            onChange={handleChange}
            onSelect={handleTextSelection}
            style={{ 
              fontFamily: fontFamily,
              fontSize: `${getDocumentFontSize()}pt`,
              lineHeight: '1.6'
            }}
            className="min-h-[500px] leading-relaxed resize-none"
            placeholder="Your cover letter content..."
            spellCheck
          />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <Badge 
                  variant={wordCount > 450 ? 'destructive' : wordCount > 400 ? 'default' : 'secondary'}
                  className={wordCount > 450 ? 'animate-pulse' : ''}
                >
                  {wordCount} words
                  {wordCount > 450 && ' ⚠️ Too long!'}
                  {wordCount >= 300 && wordCount <= 450 && ' ✓'}
                </Badge>
                <Badge variant="secondary">
                  {charCount} characters
                </Badge>
                <Badge variant="secondary">
                  {sentenceCount} sentences
                </Badge>
                <Badge variant="secondary">
                  {paragraphCount} paragraphs
                </Badge>
                {avgSentenceLength > 0 && (
                  <Badge variant="outline">
                    Avg: {avgSentenceLength} words/sentence
                  </Badge>
                )}
              </div>
              
              {readability && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Readability:</span>
                  <Badge className={readability.color}>
                    {readability.label} ({readabilityScore})
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isOpen = document.getElementById('readability-details')?.classList.contains('hidden');
                      document.getElementById('readability-details')?.classList.toggle('hidden', !isOpen);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    {readabilityScore && readabilityScore < 70 ? '⚠️ Why?' : 'ℹ️ Info'}
                  </Button>
                </div>
              )}
            </div>

            {/* Readability Explanation */}
            {readability && (
              <Card id="readability-details" className="hidden border-l-4" style={{ borderLeftColor: readability.color.replace('bg-', '#') }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Readability Analysis: {readability.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {readability.explanation}
                  </div>
                  {readability.suggestions && readability.suggestions.length > 0 && (
                    <div>
                      <div className="font-semibold text-sm mb-2">💡 Suggestions to Improve:</div>
                      <ul className="space-y-1.5">
                        {readability.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm flex gap-2">
                            <span className="text-primary shrink-0">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      <strong>Target for Cover Letters:</strong> Aim for a score between 60-70 (Standard to Fairly Easy) for the best balance of professionalism and clarity.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Writing Assistance Tools */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedText) {
                    getSynonymSuggestions(selectedText);
                  } else {
                    toast.info('Select a word in the text to get synonym suggestions');
                  }
                }}
                disabled={!selectedText || isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Synonyms
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={getRestructuringSuggestions}
                disabled={!content.trim()}
              >
                <Edit className="h-4 w-4 mr-2" />
                Restructure Suggestions
              </Button>
            </div>

            {/* Synonym Suggestions */}
            {showSynonyms && synonymSuggestions.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Synonyms for \"{selectedText}\"
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSynonyms(false)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {synonymSuggestions.map((synonym, index) => (
                      <Button
                        key={index}
                        variant="secondary"
                        size="sm"
                        onClick={() => applySynonym(synonym)}
                        className="capitalize"
                      >
                        {synonym}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Restructuring Suggestions */}
            {showRestructuring && restructuringSuggestions.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Edit className="h-4 w-4 text-yellow-600" />
                      Writing Suggestions ({restructuringSuggestions.length})
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRestructuring(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Tips to improve clarity and readability
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {restructuringSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 bg-background/50 ${
                        suggestion.severity === 'warning'
                          ? 'border-orange-500'
                          : suggestion.severity === 'info'
                          ? 'border-blue-500'
                          : 'border-green-500'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge
                          variant={suggestion.severity === 'warning' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {suggestion.type}
                        </Badge>
                        <p className="text-sm flex-1">{suggestion.message}</p>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 pl-2 border-l-2">
                        \"{suggestion.original.substring(0, 100)}{suggestion.original.length > 100 ? '...' : ''}\"
                      </div>
                      <div className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded">
                        <span className="font-semibold">Suggestion:</span> {suggestion.suggestion}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Auto-saving in 3 seconds...</span>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Live Preview Section */}
      <div className="w-full xl:w-1/2 min-w-0 max-w-full flex flex-col overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm sm:text-base">Live Preview</CardTitle>
              <CardDescription className="text-xs sm:text-sm">See how your cover letter will look</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 flex-1 min-h-0 overflow-hidden">
              <div className="bg-white text-black p-2 sm:p-3 lg:p-4 rounded border h-full overflow-y-auto w-full max-w-full">
            <div className="prose prose-sm max-w-none w-full break-words">
              {content ? (
                <div 
                  className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm break-words"
                  style={{
                    fontFamily: fontFamily,
                    fontSize: window.innerWidth < 640 ? '8pt' : window.innerWidth < 1024 ? '9pt' : `${getDocumentFontSize()}pt`,
                    lineHeight: window.innerWidth < 640 ? '1.3' : '1.4',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {content}
                </div>
              ) : (
                <p className="text-gray-400 italic text-xs sm:text-sm">
                  Start typing to see your cover letter preview...
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>

      {/* AI Insights Dialog - Shows all variations, company research, and suggestions */}
      <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
      <DialogContent className="w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader className="pr-4">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            AI Cover Letter Insights
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Explore all variations, company research, and improvement suggestions
          </DialogDescription>
        </DialogHeader>

        {generatedData && (
          <Tabs defaultValue="variations" className="mt-4">
            <TabsList className="flex flex-wrap w-full h-auto gap-1 bg-muted p-1">
              <TabsTrigger value="variations" className="flex-shrink-0 text-xs sm:text-sm touch-manipulation px-2 py-1">All Variations</TabsTrigger>
              <TabsTrigger value="research" className="flex-shrink-0 text-xs sm:text-sm touch-manipulation px-2 py-1">Company Research</TabsTrigger>
              <TabsTrigger value="suggestions" className="flex-shrink-0 text-xs sm:text-sm touch-manipulation px-2 py-1">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="variations" className="space-y-4">
              {generatedData.variations?.map((variation: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Variation {index + 1}</CardTitle>
                        <CardDescription>Tone: {variation.tone}</CardDescription>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const header = variation.header || '';
                            const text = header 
                              ? `${header}\n\n${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`
                              : `${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`;
                            setContent(text);
                            setHasChanges(true);
                            toast.success('Variation loaded into editor');
                          }}
                          className="flex-1 sm:flex-none touch-manipulation"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Use This
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const header = variation.header || '';
                            const text = header 
                              ? `${header}\n\n${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`
                              : `${variation.opening}\n\n${variation.body1}\n\n${variation.body2}\n\n${variation.closing}`;
                            navigator.clipboard.writeText(text);
                            toast.success('Copied to clipboard');
                          }}
                          className="flex-1 sm:flex-none touch-manipulation"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="font-semibold text-sm mb-1">Opening</div>
                      <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">{variation.opening}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Body - Part 1</div>
                      <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">{variation.body1}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Body - Part 2</div>
                      <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">{variation.body2}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Closing</div>
                      <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">{variation.closing}</div>
                    </div>
                    {variation.keyStrengths?.length > 0 && (
                      <div>
                        <div className="font-semibold text-sm mb-1">Key Strengths</div>
                        <div className="flex flex-wrap gap-2">
                          {variation.keyStrengths.map((strength: string, i: number) => (
                            <Badge key={i} variant="secondary">{strength}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="research" className="space-y-4">
              {generatedData.companyResearch && (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent News</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{generatedData.companyResearch.recentNews}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cultural Alignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{generatedData.companyResearch.culturalAlignment}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Value Proposition</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{generatedData.companyResearch.valueProposition}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {generatedData.improvementSuggestions?.map((suggestion: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {generatedData.experienceAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Experience Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedData.experienceAnalysis.topMatches?.length > 0 && (
                      <div>
                        <div className="font-semibold text-sm mb-2">Top Matching Experiences</div>
                        <ul className="space-y-2">
                          {generatedData.experienceAnalysis.topMatches.map((match: any, i: number) => (
                            <li key={i} className="p-2 bg-muted rounded">
                              <div className="flex gap-2 items-start text-sm">
                                <span className="text-primary">★</span>
                                <div>
                                  <span className="font-medium">{typeof match === 'string' ? match : match.experience}</span>
                                  {match.reason && <p className="text-muted-foreground text-xs mt-1">{match.reason}</p>}
                                  {match.score && <span className="text-xs text-primary ml-2">({match.score}% match)</span>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedData.experienceAnalysis.suggestedAdditions?.length > 0 && (
                      <div>
                        <div className="font-semibold text-sm mb-2">Additional Relevant Experiences</div>
                        <ul className="space-y-1">
                          {generatedData.experienceAnalysis.suggestedAdditions.map((add: any, i: number) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                              <span>+</span>
                              <span>{typeof add === 'string' ? add : add.experience || add.reason || JSON.stringify(add)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
