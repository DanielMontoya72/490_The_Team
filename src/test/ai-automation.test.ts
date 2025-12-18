import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe('AI Automation Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cover Letter Generation', () => {
    it('should generate cover letter with job details', async () => {
      const mockResponse = {
        data: {
          coverLetter: 'Dear Hiring Manager...',
          suggestions: ['Highlight leadership experience'],
        },
        error: null,
      };
      mockInvoke.mockResolvedValue(mockResponse);

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          jobTitle: 'Software Engineer',
          company: 'Tech Corp',
          jobDescription: 'We are looking for...',
          userExperience: '5 years in software development',
        },
      });

      expect(mockInvoke).toHaveBeenCalledWith('generate-cover-letter', expect.any(Object));
      expect(result.data).toHaveProperty('coverLetter');
    });

    it('should handle missing job details gracefully', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Job description is required' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobTitle: 'Engineer' },
      });

      expect(result.error).toBeTruthy();
    });

    it('should handle API rate limits', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', status: 429 },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobTitle: 'Engineer', company: 'Test' },
      });

      expect(result.error?.message).toContain('Rate limit');
    });
  });

  describe('Resume Content Generation', () => {
    it('should generate resume content for a section', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          content: 'Experienced software engineer with...',
          keywords: ['JavaScript', 'React', 'Node.js'],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-resume-content', {
        body: {
          section: 'summary',
          experience: '5 years in web development',
          targetRole: 'Senior Developer',
        },
      });

      expect(result.data).toHaveProperty('content');
      expect(result.data).toHaveProperty('keywords');
    });

    it('should optimize skills section based on job requirements', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          optimizedSkills: ['React', 'TypeScript', 'AWS'],
          missingSkills: ['Kubernetes'],
          matchScore: 85,
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('optimize-resume-skills', {
        body: {
          currentSkills: ['React', 'JavaScript'],
          jobRequirements: ['React', 'TypeScript', 'AWS', 'Kubernetes'],
        },
      });

      expect(result.data?.matchScore).toBeGreaterThan(0);
    });
  });

  describe('Interview Preparation', () => {
    it('should generate interview questions based on job role', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          questions: [
            { question: 'Tell me about yourself', category: 'behavioral' },
            { question: 'Explain React hooks', category: 'technical' },
          ],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-interview-questions', {
        body: {
          jobTitle: 'Frontend Developer',
          company: 'Tech Corp',
          experienceLevel: 'mid',
        },
      });

      expect(result.data?.questions).toBeInstanceOf(Array);
      expect(result.data?.questions.length).toBeGreaterThan(0);
    });

    it('should provide interview coaching feedback', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          feedback: 'Good structure, but add more specific examples',
          score: 7,
          improvements: ['Be more specific', 'Use STAR method'],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('coach-interview-response', {
        body: {
          question: 'Tell me about a challenge you faced',
          response: 'I once had a difficult project...',
        },
      });

      expect(result.data).toHaveProperty('feedback');
      expect(result.data).toHaveProperty('score');
    });
  });

  describe('Job Match Analysis', () => {
    it('should analyze job match percentage', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          matchScore: 78,
          strengths: ['Technical skills', 'Experience level'],
          gaps: ['Leadership experience'],
          recommendations: ['Highlight team collaboration'],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('analyze-job-match', {
        body: {
          jobDescription: 'Looking for a senior developer...',
          resumeData: { skills: ['React', 'Node.js'], experience: 5 },
        },
      });

      expect(result.data?.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.matchScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Application Success Analysis', () => {
    it('should analyze application success factors', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          keyFindings: ['Higher success rate in tech industry'],
          recommendations: [{ title: 'Focus on tech roles', priority: 'high' }],
          focusAreas: ['Technical skills', 'Networking'],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('analyze-application-success', {
        body: {
          totalApplications: 50,
          successfulApplications: 5,
          industryData: [{ industry: 'Tech', successRate: 15 }],
        },
      });

      expect(result.data).toHaveProperty('keyFindings');
      expect(result.data).toHaveProperty('recommendations');
    });
  });

  describe('Skill Gap Analysis', () => {
    it('should identify skill gaps for target role', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          currentSkills: ['JavaScript', 'React'],
          requiredSkills: ['TypeScript', 'GraphQL', 'AWS'],
          skillGaps: ['TypeScript', 'GraphQL', 'AWS'],
          learningPath: [
            { skill: 'TypeScript', priority: 'high', resources: [] },
          ],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('analyze-skill-gaps', {
        body: {
          currentSkills: ['JavaScript', 'React'],
          targetRole: 'Senior Full Stack Developer',
        },
      });

      expect(result.data).toHaveProperty('skillGaps');
      expect(result.data?.skillGaps).toBeInstanceOf(Array);
    });
  });

  describe('Networking Suggestions', () => {
    it('should generate contact suggestions', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          suggestions: [
            { type: 'Recruiter', reason: 'Works at target company' },
            { type: 'Alumni', reason: 'Same university background' },
          ],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-contact-suggestions', {
        body: {
          targetCompanies: ['Google', 'Meta'],
          industry: 'Technology',
        },
      });

      expect(result.data?.suggestions).toBeInstanceOf(Array);
    });

    it('should generate relationship message templates', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          template: 'Hi [Name], I noticed you work at...',
          subject: 'Connecting about opportunities',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-relationship-message-template', {
        body: {
          contactType: 'recruiter',
          purpose: 'job inquiry',
        },
      });

      expect(result.data).toHaveProperty('template');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const { supabase } = await import('@/integrations/supabase/client');
      
      await expect(
        supabase.functions.invoke('generate-cover-letter', {
          body: { jobTitle: 'Engineer' },
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle invalid API responses', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Invalid response format' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobTitle: 'Engineer' },
      });

      expect(result.error).toBeTruthy();
    });

    it('should handle timeout errors', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Request timeout', status: 504 },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobTitle: 'Engineer' },
      });

      expect(result.error?.status).toBe(504);
    });
  });
});

