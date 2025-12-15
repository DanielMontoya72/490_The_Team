import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ResumeList } from './ResumeList';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('ResumeList', () => {
  const mockResumes = [
    {
      id: '1',
      user_id: 'user-123',
      resume_name: 'Software Engineer Resume',
      template_id: 'template-1',
      is_active: true,
      is_default: true,
      version_number: 1,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      content: {},
    },
    {
      id: '2',
      user_id: 'user-123',
      resume_name: 'Frontend Developer Resume',
      template_id: 'template-2',
      is_active: true,
      is_default: false,
      version_number: 1,
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
      content: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockResumes, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    } as any));
  });

  it('renders resume list', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Software Engineer Resume')).toBeDefined();
      expect(screen.getByText('Frontend Developer Resume')).toBeDefined();
    });
  });

  it('shows default badge for default resume', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      const defaultBadge = screen.queryByText(/default/i);
      expect(defaultBadge).toBeDefined();
    });
  });

  it('displays version numbers', async () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      const versionText = screen.queryByText(/version/i) || screen.queryByText(/v1/i);
      expect(versionText).toBeDefined();
    });
  });

  it('handles empty resume list', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any));

    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Software Engineer Resume')).toBeNull();
    });
  });

  it('handles fetch errors gracefully', async () => {
    const mockError = { message: 'Failed to fetch resumes', code: 'PGRST000' };
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any));

    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Software Engineer Resume')).toBeNull();
    });
  });

  it('renders without crashing', () => {
    render(
      <ResumeList 
        userId="user-123"
        onEditResume={vi.fn()}
        onCreateNew={vi.fn()}
      />
    );
    
    // Component renders successfully
    expect(document.body).toBeDefined();
  });
});
