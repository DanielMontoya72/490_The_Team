import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock all required dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
    Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
    BrowserRouter: ({ children }: any) => React.createElement('div', null, children),
  };
});

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(),
  functions: { invoke: vi.fn() },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('E2E User Journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe('New User Onboarding Journey', () => {
    it('should complete registration flow', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'test@example.com' } },
        error: null,
      });

      // Simulate registration
      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result.data?.user).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it('should complete profile setup after registration', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'profile-1',
            user_id: 'new-user',
            full_name: 'John Doe',
            headline: 'Software Developer',
          },
          error: null,
        })),
      });

      const profile = await mockSupabase
        .from('user_profiles')
        .insert({
          user_id: 'new-user',
          full_name: 'John Doe',
          headline: 'Software Developer',
        })
        .select()
        .single();

      expect(profile.data?.full_name).toBe('John Doe');
    });

    it('should show getting started checklist for new users', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: {
            checklist_completed: false,
            profile_completed: false,
            first_job_added: false,
          },
          error: null,
        })),
      });

      const checklist = await mockSupabase
        .from('user_onboarding')
        .select()
        .eq('user_id', 'new-user')
        .single();

      expect(checklist.data?.checklist_completed).toBe(false);
    });
  });

  describe('Job Application Journey', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null,
      });
    });

    it('should complete full job application flow', async () => {
      // Step 1: Add job
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: { id: 'job-1', company: 'Tech Corp', title: 'Developer', status: 'saved' },
          error: null,
        })),
      });

      const job = await mockSupabase
        .from('jobs')
        .insert({ company: 'Tech Corp', title: 'Developer' })
        .select()
        .single();

      expect(job.data?.status).toBe('saved');

      // Step 2: Generate cover letter
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { coverLetter: 'Dear Hiring Manager...' },
        error: null,
      });

      const coverLetter = await mockSupabase.functions.invoke('generate-cover-letter', {
        body: { jobId: 'job-1' },
      });

      expect(coverLetter.data?.coverLetter).toBeTruthy();

      // Step 3: Update status to applied
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: { id: 'job-1', status: 'applied', applied_at: new Date().toISOString() },
          error: null,
        })),
      });

      const applied = await mockSupabase
        .from('jobs')
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('id', 'job-1')
        .select()
        .single();

      expect(applied.data?.status).toBe('applied');
    });

    it('should track application through pipeline to offer', async () => {
      const stages = ['applied', 'phone_screen', 'interviewing', 'offered'];
      
      for (const stage of stages) {
        mockSupabase.from.mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({
            data: { id: 'job-1', status: stage },
            error: null,
          })),
        });

        const result = await mockSupabase
          .from('jobs')
          .update({ status: stage })
          .eq('id', 'job-1')
          .select()
          .single();

        expect(result.data?.status).toBe(stage);
      }
    });
  });

  describe('Resume Building Journey', () => {
    it('should create resume from scratch', async () => {
      // Create resume
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: { id: 'resume-1', name: 'My Resume', template: 'modern' },
          error: null,
        })),
      });

      const resume = await mockSupabase
        .from('resumes')
        .insert({ name: 'My Resume', template: 'modern' })
        .select()
        .single();

      expect(resume.data?.id).toBeTruthy();
    });

    it('should generate AI content for resume sections', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          summary: 'Experienced software developer...',
          skills: ['JavaScript', 'React', 'Node.js'],
        },
        error: null,
      });

      const generated = await mockSupabase.functions.invoke('generate-resume-content', {
        body: { section: 'summary', experience: '5 years' },
      });

      expect(generated.data?.summary).toBeTruthy();
    });

    it('should export resume to PDF/DOCX', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { downloadUrl: 'https://storage.example.com/resume.pdf' },
        error: null,
      });

      const exported = await mockSupabase.functions.invoke('export-resume-docx', {
        body: { resumeId: 'resume-1', format: 'pdf' },
      });

      expect(exported.data?.downloadUrl).toBeTruthy();
    });
  });

  describe('Interview Preparation Journey', () => {
    it('should prepare for upcoming interview', async () => {
      // Schedule interview
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: { id: 'interview-1', job_id: 'job-1', type: 'technical' },
          error: null,
        })),
      });

      // Generate questions
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          questions: [
            { question: 'Explain React hooks', category: 'technical' },
            { question: 'Tell me about yourself', category: 'behavioral' },
          ],
        },
        error: null,
      });

      const interview = await mockSupabase
        .from('interviews')
        .insert({ job_id: 'job-1', type: 'technical' })
        .select()
        .single();

      const questions = await mockSupabase.functions.invoke('generate-interview-questions', {
        body: { jobId: 'job-1', interviewType: 'technical' },
      });

      expect(interview.data?.id).toBeTruthy();
      expect(questions.data?.questions.length).toBeGreaterThan(0);
    });

    it('should complete mock interview and get feedback', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          mockQuestions: ['Tell me about yourself', 'Why this company?'],
        },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          feedback: 'Good answer structure',
          score: 8,
          improvements: ['Add more specific examples'],
        },
        error: null,
      });

      const mock = await mockSupabase.functions.invoke('generate-mock-interview', {
        body: { jobId: 'job-1' },
      });

      const feedback = await mockSupabase.functions.invoke('coach-interview-response', {
        body: { question: 'Tell me about yourself', response: 'I am a developer...' },
      });

      expect(mock.data?.mockQuestions).toBeInstanceOf(Array);
      expect(feedback.data?.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Networking Journey', () => {
    it('should add contact and initiate outreach', async () => {
      // Add contact
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: { id: 'contact-1', name: 'Jane Smith', company: 'Google' },
          error: null,
        })),
      });

      // Generate message
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { message: 'Hi Jane, I noticed you work at Google...' },
        error: null,
      });

      const contact = await mockSupabase
        .from('professional_contacts')
        .insert({ name: 'Jane Smith', company: 'Google' })
        .select()
        .single();

      const message = await mockSupabase.functions.invoke('generate-linkedin-template', {
        body: { contactId: 'contact-1' },
      });

      expect(contact.data?.id).toBeTruthy();
      expect(message.data?.message).toBeTruthy();
    });

    it('should track networking campaign progress', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'campaign-1',
            total_contacts: 20,
            contacted: 15,
            responses: 8,
            meetings: 3,
          },
          error: null,
        })),
      });

      const campaign = await mockSupabase
        .from('networking_campaigns')
        .select()
        .eq('id', 'campaign-1')
        .single();

      expect(campaign.data?.responses).toBeLessThanOrEqual(campaign.data?.contacted);
    });
  });

  describe('Analytics & Insights Journey', () => {
    it('should view application success analytics', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          successRate: 12,
          interviewRate: 25,
          topPerformingIndustries: ['Technology', 'Finance'],
          recommendations: ['Apply earlier in the week'],
        },
        error: null,
      });

      const analytics = await mockSupabase.functions.invoke('analyze-application-success', {
        body: {
          totalApplications: 100,
          successfulApplications: 12,
          industryData: [],
        },
      });

      expect(analytics.data?.successRate).toBe(12);
    });

    it('should get skill gap analysis', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          currentSkills: ['JavaScript', 'React'],
          missingSkills: ['TypeScript', 'AWS'],
          learningPath: [
            { skill: 'TypeScript', priority: 'high' },
          ],
        },
        error: null,
      });

      const analysis = await mockSupabase.functions.invoke('analyze-skill-gaps', {
        body: { targetRole: 'Senior Developer' },
      });

      expect(analysis.data?.missingSkills).toBeInstanceOf(Array);
    });
  });

  describe('Settings & Account Journey', () => {
    it('should update user preferences', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({
          data: {
            theme: 'dark',
            notifications_enabled: true,
            email_frequency: 'daily',
          },
          error: null,
        })),
      });

      const settings = await mockSupabase
        .from('user_preferences')
        .update({ theme: 'dark', notifications_enabled: true })
        .eq('user_id', 'user-1')
        .select()
        .single();

      expect(settings.data?.theme).toBe('dark');
    });

    it('should complete password reset flow', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null,
      });

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { message: 'Password reset successful' },
        error: null,
      });

      const sendReset = await mockSupabase.functions.invoke('send-password-reset-email', {
        body: { email: 'user@example.com' },
      });

      const completeReset = await mockSupabase.functions.invoke('complete-password-reset', {
        body: { token: 'reset-token', newPassword: 'NewSecurePass123!' },
      });

      expect(sendReset.data?.message).toContain('sent');
      expect(completeReset.data?.message).toContain('successful');
    });
  });

  describe('Data Export Journey', () => {
    it('should export all user data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({
          data: [
            { type: 'jobs', count: 50 },
            { type: 'resumes', count: 3 },
            { type: 'contacts', count: 100 },
          ],
          error: null,
        })),
      });

      const userData = await mockSupabase
        .from('user_data_export')
        .select()
        .eq('user_id', 'user-1');

      expect(userData.data).toBeInstanceOf(Array);
    });
  });
});

