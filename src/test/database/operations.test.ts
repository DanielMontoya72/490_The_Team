import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      })),
    },
  },
}));

describe('Database Operation Tests - Sprint 4 Entities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock query builder
  const createMockQueryBuilder = (data: any = null, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
    then: vi.fn((cb) => cb({ data: data ? [data] : [], error })),
  });

  describe('Jobs Table Operations', () => {
    it('should create a new job', async () => {
      const mockJob = {
        id: 'job-1',
        user_id: 'test-user-id',
        company: 'Tech Corp',
        title: 'Software Engineer',
        status: 'saved',
        created_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockJob));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .insert({ company: 'Tech Corp', title: 'Software Engineer' })
        .select()
        .single();

      expect(result.data).toEqual(mockJob);
      expect(mockFrom).toHaveBeenCalledWith('jobs');
    });

    it('should read jobs with filters', async () => {
      const mockJobs = [
        { id: 'job-1', company: 'Tech Corp', status: 'applied' },
        { id: 'job-2', company: 'StartupCo', status: 'applied' },
      ];

      mockFrom.mockReturnValue({
        ...createMockQueryBuilder(),
        then: vi.fn((cb) => cb({ data: mockJobs, error: null })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .select()
        .eq('status', 'applied')
        .eq('user_id', 'test-user-id');

      expect(result.data).toHaveLength(2);
    });

    it('should update job status', async () => {
      const updatedJob = { id: 'job-1', status: 'interviewing' };
      mockFrom.mockReturnValue(createMockQueryBuilder(updatedJob));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .update({ status: 'interviewing' })
        .eq('id', 'job-1')
        .select()
        .single();

      expect(result.data?.status).toBe('interviewing');
    });

    it('should delete a job', async () => {
      mockFrom.mockReturnValue(createMockQueryBuilder({ id: 'job-1' }));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .delete()
        .eq('id', 'job-1')
        .select()
        .single();

      expect(result.error).toBeNull();
    });

    it('should handle archived jobs', async () => {
      const archivedJob = { id: 'job-1', archived: true };
      mockFrom.mockReturnValue(createMockQueryBuilder(archivedJob));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .update({ archived: true })
        .eq('id', 'job-1')
        .select()
        .single();

      expect(result.data?.archived).toBe(true);
    });
  });

  describe('Resumes Table Operations', () => {
    it('should create a resume', async () => {
      const mockResume = {
        id: 'resume-1',
        user_id: 'test-user-id',
        name: 'My Resume',
        template: 'modern',
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockResume));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('resumes')
        .insert({ name: 'My Resume', template: 'modern' })
        .select()
        .single();

      expect(result.data?.name).toBe('My Resume');
    });

    it('should update resume content', async () => {
      const updatedResume = {
        id: 'resume-1',
        content: { summary: 'Updated summary' },
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(updatedResume));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('resumes')
        .update({ content: { summary: 'Updated summary' } })
        .eq('id', 'resume-1')
        .select()
        .single();

      expect(result.data?.content.summary).toBe('Updated summary');
    });
  });

  describe('Cover Letters Table Operations', () => {
    it('should create cover letter linked to job', async () => {
      const mockCoverLetter = {
        id: 'cl-1',
        job_id: 'job-1',
        content: 'Dear Hiring Manager...',
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockCoverLetter));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('cover_letters')
        .insert({ job_id: 'job-1', content: 'Dear Hiring Manager...' })
        .select()
        .single();

      expect(result.data?.job_id).toBe('job-1');
    });
  });

  describe('Professional Contacts Table Operations', () => {
    it('should create a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        user_id: 'test-user-id',
        name: 'John Doe',
        company: 'Tech Corp',
        email: 'john@techcorp.com',
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockContact));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('professional_contacts')
        .insert({ name: 'John Doe', company: 'Tech Corp' })
        .select()
        .single();

      expect(result.data?.name).toBe('John Doe');
    });

    it('should query contacts by company', async () => {
      const mockContacts = [
        { id: 'contact-1', name: 'John', company: 'Google' },
        { id: 'contact-2', name: 'Jane', company: 'Google' },
      ];

      mockFrom.mockReturnValue({
        ...createMockQueryBuilder(),
        then: vi.fn((cb) => cb({ data: mockContacts, error: null })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('professional_contacts')
        .select()
        .eq('company', 'Google');

      expect(result.data).toHaveLength(2);
    });
  });

  describe('Interviews Table Operations', () => {
    it('should schedule an interview', async () => {
      const mockInterview = {
        id: 'interview-1',
        job_id: 'job-1',
        scheduled_at: '2024-01-20T10:00:00Z',
        type: 'technical',
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockInterview));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('interviews')
        .insert({
          job_id: 'job-1',
          scheduled_at: '2024-01-20T10:00:00Z',
          type: 'technical',
        })
        .select()
        .single();

      expect(result.data?.type).toBe('technical');
    });
  });

  describe('User Profiles Table Operations', () => {
    it('should update user profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        user_id: 'test-user-id',
        full_name: 'Jane Doe',
        headline: 'Senior Developer',
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockProfile));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('user_profiles')
        .upsert({ user_id: 'test-user-id', full_name: 'Jane Doe' })
        .select()
        .single();

      expect(result.data?.full_name).toBe('Jane Doe');
    });
  });

  describe('Networking Campaigns Table Operations', () => {
    it('should create networking campaign', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        user_id: 'test-user-id',
        name: 'Q1 Outreach',
        target_companies: ['Google', 'Meta'],
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockCampaign));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('networking_campaigns')
        .insert({ name: 'Q1 Outreach', target_companies: ['Google', 'Meta'] })
        .select()
        .single();

      expect(result.data?.name).toBe('Q1 Outreach');
    });
  });

  describe('API Usage Logs Table Operations', () => {
    it('should log API usage', async () => {
      const mockLog = {
        id: 'log-1',
        user_id: 'test-user-id',
        endpoint: 'generate-cover-letter',
        tokens_used: 500,
        created_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockLog));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('api_usage_logs')
        .insert({ endpoint: 'generate-cover-letter', tokens_used: 500 })
        .select()
        .single();

      expect(result.data?.tokens_used).toBe(500);
    });
  });

  describe('Password Reset Tokens Table Operations', () => {
    it('should create password reset token', async () => {
      const mockToken = {
        id: 'token-1',
        user_id: 'test-user-id',
        token: 'reset-token-123',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockToken));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('password_reset_tokens')
        .insert({ user_id: 'test-user-id', token: 'reset-token-123' })
        .select()
        .single();

      expect(result.data?.token).toBe('reset-token-123');
    });

    it('should mark token as used', async () => {
      const mockToken = {
        id: 'token-1',
        token: 'reset-token-123',
        used_at: new Date().toISOString(),
      };

      mockFrom.mockReturnValue(createMockQueryBuilder(mockToken));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', 'reset-token-123')
        .select()
        .single();

      expect(result.data?.used_at).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle unique constraint violations', async () => {
      mockFrom.mockReturnValue(createMockQueryBuilder(null, {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      }));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('user_profiles')
        .insert({ user_id: 'test-user-id', email: 'existing@example.com' })
        .select()
        .single();

      expect(result.error?.code).toBe('23505');
    });

    it('should handle foreign key violations', async () => {
      mockFrom.mockReturnValue(createMockQueryBuilder(null, {
        code: '23503',
        message: 'insert or update on table violates foreign key constraint',
      }));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('cover_letters')
        .insert({ job_id: 'non-existent-job', content: 'Test' })
        .select()
        .single();

      expect(result.error?.code).toBe('23503');
    });

    it('should handle RLS policy violations', async () => {
      mockFrom.mockReturnValue(createMockQueryBuilder(null, {
        code: '42501',
        message: 'permission denied for table',
      }));

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .select()
        .eq('user_id', 'other-user-id');

      expect(result.error?.code).toBe('42501');
    });
  });

  describe('RPC Functions', () => {
    it('should call stored procedure', async () => {
      mockRpc.mockResolvedValue({
        data: { total_jobs: 50, applied: 30, interviewing: 10 },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('get_job_statistics', {
        user_id: 'test-user-id',
      });

      expect(result.data?.total_jobs).toBe(50);
    });
  });

  describe('Batch Operations', () => {
    it('should insert multiple records', async () => {
      const mockJobs = [
        { id: 'job-1', company: 'Company 1' },
        { id: 'job-2', company: 'Company 2' },
        { id: 'job-3', company: 'Company 3' },
      ];

      mockFrom.mockReturnValue({
        ...createMockQueryBuilder(),
        then: vi.fn((cb) => cb({ data: mockJobs, error: null })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .insert([
          { company: 'Company 1' },
          { company: 'Company 2' },
          { company: 'Company 3' },
        ])
        .select();

      expect(result.data).toHaveLength(3);
    });
  });

  describe('Pagination & Ordering', () => {
    it('should paginate results', async () => {
      const mockJobs = Array.from({ length: 10 }, (_, i) => ({
        id: `job-${i}`,
        company: `Company ${i}`,
      }));

      mockFrom.mockReturnValue({
        ...createMockQueryBuilder(),
        then: vi.fn((cb) => cb({ data: mockJobs, error: null })),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase
        .from('jobs')
        .select()
        .range(0, 9)
        .order('created_at', { ascending: false });

      expect(result.data).toHaveLength(10);
    });
  });
});

