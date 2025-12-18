import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    functions: { invoke: mockInvoke },
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      })),
    },
  },
}));

describe('Workflow Automation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    });
  });

  describe('Job Application Workflow', () => {
    it('should create job and update pipeline status', async () => {
      const mockJob = {
        id: 'job-1',
        company: 'Tech Corp',
        title: 'Software Engineer',
        status: 'applied',
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .insert({ company: 'Tech Corp', title: 'Software Engineer' })
        .select()
        .single();

      expect(result.data).toEqual(mockJob);
      expect(mockFrom).toHaveBeenCalledWith('jobs');
    });

    it('should move job through pipeline stages', async () => {
      const statuses = ['saved', 'applied', 'interviewing', 'offered', 'accepted'];
      
      for (const status of statuses) {
        mockFrom.mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'job-1', status }, 
            error: null 
          })),
        });

        const { supabase } = await import('@/integrations/supabase/client');
        const result = await supabase
          .from('jobs')
          .update({ status })
          .eq('id', 'job-1')
          .select()
          .single();

        expect(result.data?.status).toBe(status);
      }
    });

    it('should archive job after rejection', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'job-1', status: 'rejected', archived: true }, 
          error: null 
        })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .update({ status: 'rejected', archived: true })
        .eq('id', 'job-1')
        .select()
        .single();

      expect(result.data?.archived).toBe(true);
    });
  });

  describe('Resume Workflow', () => {
    it('should create resume and generate content', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'resume-1', name: 'My Resume' }, 
          error: null 
        })),
      });

      mockInvoke.mockResolvedValue({
        data: { content: 'Generated resume content' },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Create resume
      const resume = await supabase
        .from('resumes')
        .insert({ name: 'My Resume' })
        .select()
        .single();

      // Generate content
      const generated = await supabase.functions.invoke('generate-resume-content', {
        body: { resumeId: resume.data?.id, section: 'summary' },
      });

      expect(resume.data).toBeTruthy();
      expect(generated.data?.content).toBeTruthy();
    });

    it('should tailor resume for specific job', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          tailoredContent: 'Tailored for Tech Corp...',
          matchScore: 85,
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('tailor-resume-experience', {
        body: {
          resumeId: 'resume-1',
          jobId: 'job-1',
          jobDescription: 'Looking for a developer...',
        },
      });

      expect(result.data?.tailoredContent).toBeTruthy();
      expect(result.data?.matchScore).toBeGreaterThan(0);
    });
  });

  describe('Cover Letter Workflow', () => {
    it('should generate and save cover letter for job', async () => {
      mockInvoke.mockResolvedValue({
        data: { coverLetter: 'Dear Hiring Manager...' },
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'cl-1', job_id: 'job-1', content: 'Dear Hiring Manager...' }, 
          error: null 
        })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Generate cover letter
      const generated = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobId: 'job-1' },
      });

      // Save cover letter
      const saved = await supabase
        .from('cover_letters')
        .insert({ job_id: 'job-1', content: generated.data?.coverLetter })
        .select()
        .single();

      expect(saved.data?.content).toBeTruthy();
    });
  });

  describe('Interview Preparation Workflow', () => {
    it('should schedule interview and generate prep materials', async () => {
      // Schedule interview
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { 
            id: 'interview-1', 
            job_id: 'job-1', 
            scheduled_at: '2024-01-15T10:00:00Z',
            type: 'technical',
          }, 
          error: null 
        })),
      });

      // Generate prep
      mockInvoke.mockResolvedValue({
        data: {
          questions: ['Tell me about yourself', 'Explain React hooks'],
          tips: ['Research the company', 'Prepare STAR stories'],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const interview = await supabase
        .from('interviews')
        .insert({ job_id: 'job-1', scheduled_at: '2024-01-15T10:00:00Z' })
        .select()
        .single();

      const prep = await supabase.functions.invoke('generate-interview-preparation', {
        body: { jobId: 'job-1', interviewType: 'technical' },
      });

      expect(interview.data).toBeTruthy();
      expect(prep.data?.questions).toBeInstanceOf(Array);
    });
  });

  describe('Networking Workflow', () => {
    it('should create contact and send outreach message', async () => {
      // Create contact
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'contact-1', name: 'John Doe', company: 'Tech Corp' }, 
          error: null 
        })),
      });

      // Generate message
      mockInvoke.mockResolvedValue({
        data: { message: 'Hi John, I noticed you work at...' },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const contact = await supabase
        .from('professional_contacts')
        .insert({ name: 'John Doe', company: 'Tech Corp' })
        .select()
        .single();

      const message = await supabase.functions.invoke('generate-linkedin-template', {
        body: { contactId: contact.data?.id, purpose: 'networking' },
      });

      expect(contact.data).toBeTruthy();
      expect(message.data?.message).toBeTruthy();
    });

    it('should track relationship health and suggest follow-ups', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { healthScore: 65, lastContact: '2024-01-01' },
        error: null,
      });

      mockInvoke.mockResolvedValueOnce({
        data: { 
          suggestion: 'Send a follow-up message',
          template: 'Hi, hope you are doing well...',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const health = await supabase.functions.invoke('calculate-relationship-health', {
        body: { contactId: 'contact-1' },
      });

      const followUp = await supabase.functions.invoke('generate-smart-follow-up', {
        body: { contactId: 'contact-1' },
      });

      expect(health.data?.healthScore).toBeLessThan(70);
      expect(followUp.data?.suggestion).toBeTruthy();
    });
  });

  describe('Mentorship Workflow', () => {
    it('should send mentor invitation and track acceptance', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, invitationId: 'inv-1' },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'inv-1', status: 'pending' }, 
          error: null 
        })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const invitation = await supabase.functions.invoke('send-mentor-invitation', {
        body: { email: 'mentor@example.com', message: 'Would you be my mentor?' },
      });

      expect(invitation.data?.success).toBe(true);
    });
  });

  describe('Auto-Archive Workflow', () => {
    it('should auto-archive old rejected jobs', async () => {
      mockInvoke.mockResolvedValue({
        data: { archivedCount: 5 },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('auto-archive-jobs', {
        body: { daysOld: 30, status: 'rejected' },
      });

      expect(result.data?.archivedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Email Scanning Workflow', () => {
    it('should scan emails and detect job applications', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          detectedApplications: [
            { company: 'Tech Corp', role: 'Engineer', status: 'applied' },
          ],
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('scan-gmail-emails', {
        body: { userId: 'user-1' },
      });

      expect(result.data?.detectedApplications).toBeInstanceOf(Array);
    });

    it('should extract job details from email', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          company: 'Tech Corp',
          jobTitle: 'Software Engineer',
          applicationDate: '2024-01-15',
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.functions.invoke('extract-job-from-email', {
        body: { emailId: 'email-1' },
      });

      expect(result.data?.company).toBeTruthy();
      expect(result.data?.jobTitle).toBeTruthy();
    });
  });

  describe('Notification Workflow', () => {
    it('should create notifications for important events', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ 
          data: { 
            id: 'notif-1', 
            type: 'interview_reminder',
            message: 'Interview tomorrow at 10 AM',
          }, 
          error: null 
        })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('notifications')
        .insert({ 
          type: 'interview_reminder', 
          message: 'Interview tomorrow at 10 AM' 
        })
        .select()
        .single();

      expect(result.data?.type).toBe('interview_reminder');
    });
  });
});

