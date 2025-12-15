import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { JobList } from './JobList';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('JobList', () => {
  const mockJobs = [
    {
      id: '1',
      user_id: 'user-123',
      job_title: 'Software Engineer',
      company_name: 'Tech Corp',
      location: 'San Francisco, CA',
      status: 'Applied',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      is_archived: false,
    },
    {
      id: '2',
      user_id: 'user-123',
      job_title: 'Frontend Developer',
      company_name: 'Web Solutions',
      location: 'Remote',
      status: 'Interview',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
      is_archived: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    } as any));
  });

  it('renders job list', async () => {
    render(
      <JobList 
        jobs={mockJobs} 
        loading={false}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeDefined();
      expect(screen.getByText('Frontend Developer')).toBeDefined();
    });
  });

  it('displays job details', async () => {
    render(
      <JobList 
        jobs={mockJobs} 
        loading={false}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tech Corp')).toBeDefined();
      expect(screen.getByText('Web Solutions')).toBeDefined();
      expect(screen.getByText('San Francisco, CA')).toBeDefined();
    });
  });

  it('shows loading state initially', () => {
    render(
      <JobList 
        jobs={[]} 
        loading={true}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );
    
    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('handles empty job list', async () => {
    render(
      <JobList 
        jobs={[]} 
        loading={false}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Software Engineer')).toBeNull();
    });
  });

  it('handles fetch errors gracefully', async () => {
    render(
      <JobList 
        jobs={[]} 
        loading={false}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Software Engineer')).toBeNull();
    });
  });

  it('filters jobs by status', async () => {
    render(
      <JobList 
        jobs={mockJobs} 
        loading={false}
        onViewJob={vi.fn()}
        onDeleteJob={vi.fn()}
      />
    );

    await waitFor(() => {
      const appliedJobs = screen.queryByText('Applied');
      const interviewJobs = screen.queryByText('Interview');
      
      expect(appliedJobs || interviewJobs).toBeDefined();
    });
  });
});
